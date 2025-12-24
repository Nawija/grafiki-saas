import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    id_token?: string;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Check for OAuth errors
    if (error) {
        console.error("Google OAuth error:", error);
        return NextResponse.redirect(`${baseUrl}/login?error=oauth_${error}`);
    }

    // Verify state (CSRF protection)
    const storedState = request.cookies.get("google_oauth_state")?.value;
    if (!state || state !== storedState) {
        return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/login?error=no_code`);
    }

    try {
        // Exchange code for tokens
        const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    code,
                    client_id: process.env.GOOGLE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                    redirect_uri: `${baseUrl}/api/auth/google/callback`,
                    grant_type: "authorization_code",
                }),
            }
        );

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("Token exchange failed:", errorText);
            return NextResponse.redirect(
                `${baseUrl}/login?error=token_exchange`
            );
        }

        const tokens: GoogleTokenResponse = await tokenResponse.json();

        // Get user info
        const userResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
                headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
        );

        if (!userResponse.ok) {
            return NextResponse.redirect(`${baseUrl}/login?error=user_info`);
        }

        const googleUser: GoogleUserInfo = await userResponse.json();

        // Sign in or create user with Supabase
        const supabase = await createClient();

        // Try to sign in with OAuth - Supabase will create user if doesn't exist
        // We use signInWithIdToken for direct Google auth
        const { data, error: authError } =
            await supabase.auth.signInWithIdToken({
                provider: "google",
                token: tokens.id_token!,
            });

        if (authError) {
            console.error("Supabase auth error:", authError);

            // Fallback: Try to sign in or create user manually
            const { data: existingUser } = await supabase
                .from("auth.users")
                .select("id")
                .eq("email", googleUser.email)
                .single();

            if (!existingUser) {
                // Create new user
                const { error: signUpError } = await supabase.auth.signUp({
                    email: googleUser.email,
                    password: crypto.randomUUID(), // Random password for OAuth users
                    options: {
                        data: {
                            first_name: googleUser.given_name,
                            last_name: googleUser.family_name,
                            full_name: googleUser.name,
                            avatar_url: googleUser.picture,
                            provider: "google",
                        },
                    },
                });

                if (signUpError) {
                    console.error("Sign up error:", signUpError);
                    return NextResponse.redirect(
                        `${baseUrl}/login?error=signup_failed`
                    );
                }

                // Sign in the newly created user
                const { error: signInError } =
                    await supabase.auth.signInWithPassword({
                        email: googleUser.email,
                        password: crypto.randomUUID(), // This won't work, need magic link
                    });

                // For OAuth users, we'll redirect to a special page to complete setup
                // or use the magic link approach
            }

            return NextResponse.redirect(`${baseUrl}/login?error=auth_failed`);
        }

        // Clear the state cookie and redirect to dashboard
        const response = NextResponse.redirect(`${baseUrl}/dashboard`);
        response.cookies.delete("google_oauth_state");

        return response;
    } catch (error) {
        console.error("Google callback error:", error);
        return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`);
    }
}

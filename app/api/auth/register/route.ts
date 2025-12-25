import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendVerificationCode } from "@/lib/email/nodemailer";
import { registerApiSchema } from "@/lib/validations/auth";

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = registerApiSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email, password, fullName } = validation.data;
        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik już istnieje
        const { data: existingUser } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { error: "Użytkownik z tym adresem email już istnieje" },
                { status: 400 }
            );
        }

        // Utwórz użytkownika w Supabase Auth (bez automatycznego potwierdzenia)
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: false, // Wymagaj weryfikacji
                user_metadata: {
                    full_name: fullName,
                },
            });

        if (authError) {
            console.error("Auth error:", authError);
            return NextResponse.json(
                { error: "Nie udało się utworzyć konta" },
                { status: 500 }
            );
        }

        // Utwórz profil użytkownika
        if (authData.user) {
            await supabase.from("profiles").insert({
                id: authData.user.id,
                email,
                full_name: fullName,
            });
        }

        // Wygeneruj kod weryfikacyjny
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minut

        console.log(`[DEBUG] Verification code for ${email}: ${code}`);

        // Usuń stare kody dla tego emaila
        await supabase.from("verification_codes").delete().eq("email", email);

        // Zapisz nowy kod
        const { error: insertCodeError } = await supabase
            .from("verification_codes")
            .insert({
                email,
                code,
                expires_at: expiresAt.toISOString(),
            });

        if (insertCodeError) {
            console.error("Insert verification code error:", insertCodeError);
        }

        // Wyślij email z kodem
        await sendVerificationCode(email, code);

        return NextResponse.json({
            success: true,
            message: "Kod weryfikacyjny został wysłany na email",
        });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas rejestracji" },
            { status: 500 }
        );
    }
}

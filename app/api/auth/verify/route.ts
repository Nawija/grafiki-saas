import { NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";
import { verifyCodeSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const validation = verifyCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { email, code } = validation.data;
        const supabase = await createServiceClient();

        // Sprawdź kod weryfikacyjny
        const { data: verificationCode, error: codeError } = await supabase
            .from("verification_codes")
            .select("*")
            .eq("email", email)
            .eq("code", code)
            .single();

        if (codeError || !verificationCode) {
            return NextResponse.json(
                { error: "Nieprawidłowy kod weryfikacyjny" },
                { status: 400 }
            );
        }

        // Sprawdź czy kod nie wygasł
        if (new Date(verificationCode.expires_at) < new Date()) {
            await supabase
                .from("verification_codes")
                .delete()
                .eq("id", verificationCode.id);
            return NextResponse.json(
                { error: "Kod weryfikacyjny wygasł. Poproś o nowy kod." },
                { status: 400 }
            );
        }

        // Pobierz użytkownika
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find((u) => u.email === email);

        if (!user) {
            return NextResponse.json(
                { error: "Nie znaleziono użytkownika" },
                { status: 400 }
            );
        }

        // Potwierdź email użytkownika
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { email_confirm: true }
        );

        if (updateError) {
            console.error("Update user error:", updateError);
            return NextResponse.json(
                { error: "Nie udało się zweryfikować konta" },
                { status: 500 }
            );
        }

        // Usuń wykorzystany kod
        await supabase
            .from("verification_codes")
            .delete()
            .eq("id", verificationCode.id);

        // Zaloguj użytkownika
        const clientSupabase = await createClient();

        // Używamy OTP dla zalogowania po weryfikacji (bez hasła)
        // Musimy pobrać hasło z rejestracji lub użyć magic link
        // Tutaj przekierujemy do logowania

        return NextResponse.json({
            success: true,
            message: "Email został zweryfikowany. Możesz się teraz zalogować.",
            redirect: "/logowanie",
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas weryfikacji" },
            { status: 500 }
        );
    }
}

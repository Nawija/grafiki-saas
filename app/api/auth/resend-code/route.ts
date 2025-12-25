import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendVerificationCode } from "@/lib/email/nodemailer";

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email jest wymagany" },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        // Sprawdź czy użytkownik istnieje
        const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: "Nie znaleziono użytkownika z tym adresem email" },
                { status: 400 }
            );
        }

        // Wygeneruj nowy kod
        const code = generateCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minut

        // Usuń stare kody dla tego emaila
        await supabase.from("verification_codes").delete().eq("email", email);

        // Zapisz nowy kod
        await supabase.from("verification_codes").insert({
            email,
            code,
            type: "register" as const,
            expires_at: expiresAt.toISOString(),
        });

        // Wyślij email z kodem
        await sendVerificationCode(email, code);

        return NextResponse.json({
            success: true,
            message: "Nowy kod został wysłany na email",
        });
    } catch (error) {
        console.error("Resend code error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas wysyłania kodu" },
            { status: 500 }
        );
    }
}

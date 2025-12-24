import { NextResponse } from "next/server";
import { sendEmail, getPasswordResetEmailTemplate } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email jest wymagany" },
                { status: 400 }
            );
        }

        // Get user info from Supabase to personalize email
        const supabase = await createClient();

        // We can't directly query users, but we can send the reset email
        // Supabase will handle the actual reset token

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password/confirm`;

        // Send custom styled email
        const html = getPasswordResetEmailTemplate("Użytkowniku", resetUrl);

        await sendEmail({
            to: email,
            subject: "Resetowanie hasła - Grafiki",
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Send reset error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas wysyłania emaila" },
            { status: 500 }
        );
    }
}

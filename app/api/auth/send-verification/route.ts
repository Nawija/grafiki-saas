import { NextResponse } from "next/server";
import { sendEmail, getVerificationEmailTemplate } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const { email, name } = await request.json();

        if (!email || !name) {
            return NextResponse.json(
                { error: "Email i imię są wymagane" },
                { status: 400 }
            );
        }

        // Generate verification token
        const token = crypto.randomBytes(32).toString("hex");

        // Create verification URL
        const verificationUrl = `${
            process.env.NEXT_PUBLIC_APP_URL
        }/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;

        // Send email
        const html = getVerificationEmailTemplate(name, verificationUrl);

        await sendEmail({
            to: email,
            subject: "Potwierdź swój email - Grafiki",
            html,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Send verification error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas wysyłania emaila" },
            { status: 500 }
        );
    }
}

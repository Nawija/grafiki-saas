import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email jest wymagany" },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Nieprawidłowy format email" },
                { status: 400 }
            );
        }

        // Always return success to prevent email enumeration
        const result = await createPasswordResetCode(email);

        // Even if failed, return success for security
        return NextResponse.json({
            success: true,
            message: "Jeśli konto istnieje, kod został wysłany na email",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd serwera" },
            { status: 500 }
        );
    }
}

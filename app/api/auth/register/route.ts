import { NextRequest, NextResponse } from "next/server";
import { createVerificationCode, UserData } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, password } = body;

        // Validation
        if (!firstName || !lastName || !email || !password) {
            return NextResponse.json(
                { error: "Wszystkie pola są wymagane" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Hasło musi mieć minimum 6 znaków" },
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

        const userData: UserData = { firstName, lastName, email, password };
        const result = await createVerificationCode(email, userData, "signup");

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: "Kod weryfikacyjny został wysłany na email",
        });
    } catch (error) {
        console.error("Register error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd serwera" },
            { status: 500 }
        );
    }
}

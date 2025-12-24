import { NextRequest, NextResponse } from "next/server";
import { verifyCodeAndCreateUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code } = body;

        if (!email || !code) {
            return NextResponse.json(
                { error: "Email i kod są wymagane" },
                { status: 400 }
            );
        }

        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            return NextResponse.json(
                { error: "Kod musi składać się z 6 cyfr" },
                { status: 400 }
            );
        }

        const result = await verifyCodeAndCreateUser(email, code);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            userId: result.userId,
            message: "Konto zostało utworzone pomyślnie",
        });
    } catch (error) {
        console.error("Verify error:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd serwera" },
            { status: 500 }
        );
    }
}

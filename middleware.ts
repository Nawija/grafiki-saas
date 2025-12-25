import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
    return await updateSession(request);
}

export const config = {
    matcher: [
        /*
         * Dopasowuje wszystkie ścieżki oprócz:
         * - _next/static (pliki statyczne)
         * - _next/image (optymalizacja obrazów)
         * - favicon.ico (favicon)
         * - Pliki publiczne (svg, png, jpg, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};

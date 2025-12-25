import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Ścieżki publiczne - nie wymagają logowania
    const publicPaths = [
        "/",
        "/logowanie",
        "/rejestracja",
        "/weryfikacja",
        "/reset-hasla",
        "/api/auth",
    ];
    const isPublicPath = publicPaths.some(
        (path) =>
            request.nextUrl.pathname === path ||
            (path !== "/" && request.nextUrl.pathname.startsWith(path))
    );

    // Strona główna - przekieruj zalogowanych do dashboardu
    if (request.nextUrl.pathname === "/" && user) {
        return NextResponse.redirect(new URL("/panel", request.url));
    }

    // Jeśli użytkownik nie jest zalogowany i próbuje wejść na chronioną stronę
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = "/logowanie";
        return NextResponse.redirect(url);
    }

    // Jeśli użytkownik jest zalogowany i próbuje wejść na stronę auth
    if (
        user &&
        isPublicPath &&
        !request.nextUrl.pathname.startsWith("/api/auth")
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/panel";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

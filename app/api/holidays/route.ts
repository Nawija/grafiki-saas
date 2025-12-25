import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchHolidays } from "@/lib/api/holidays";
import type { Json } from "@/types/database";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const countryCode = searchParams.get("country") || "PL";

    if (!year) {
        return NextResponse.json(
            { error: "Parametr year jest wymagany" },
            { status: 400 }
        );
    }

    const yearNum = parseInt(year);

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return NextResponse.json(
            { error: "Nieprawidłowy rok" },
            { status: 400 }
        );
    }

    try {
        const supabase = await createClient();

        // Sprawdź cache
        const { data: cached } = await supabase
            .from("holidays_cache")
            .select("holidays")
            .eq("year", yearNum)
            .eq("country_code", countryCode)
            .single();

        if (cached) {
            return NextResponse.json({
                holidays: cached.holidays,
                cached: true,
            });
        }

        // Pobierz z API
        const holidays = await fetchHolidays(yearNum, countryCode);

        // Zapisz do cache
        await supabase.from("holidays_cache").upsert({
            year: yearNum,
            country_code: countryCode,
            holidays: holidays as unknown as Json,
        });

        return NextResponse.json({
            holidays,
            cached: false,
        });
    } catch (error) {
        console.error("Error fetching holidays:", error);
        return NextResponse.json(
            { error: "Wystąpił błąd podczas pobierania świąt" },
            { status: 500 }
        );
    }
}

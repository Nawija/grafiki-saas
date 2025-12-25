import { PublicHoliday } from "@/types";

const NAGER_API_BASE = "https://date.nager.at/api/v3";
const DEFAULT_COUNTRY = "PL";

/**
 * Pobiera święta państwowe z API date.nager.at
 */
export async function fetchHolidays(
    year: number,
    countryCode: string = DEFAULT_COUNTRY
): Promise<PublicHoliday[]> {
    try {
        const response = await fetch(
            `${NAGER_API_BASE}/PublicHolidays/${year}/${countryCode}`,
            { next: { revalidate: 60 * 60 * 24 * 365 } } // ~rok
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch holidays: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        console.error("Error fetching holidays:", error);
        return [];
    }
}

/**
 * Pobiera święta dla wielu lat (bieżący + następny)
 */
export async function fetchHolidaysForYears(
    years: number[],
    countryCode: string = DEFAULT_COUNTRY
): Promise<Map<number, PublicHoliday[]>> {
    const holidaysMap = new Map<number, PublicHoliday[]>();

    const results = await Promise.all(
        years.map((year) => fetchHolidays(year, countryCode))
    );

    years.forEach((year, index) => {
        holidaysMap.set(year, results[index]);
    });

    return holidaysMap;
}

/**
 * Formatuje datę do stringa YYYY-MM-DD bez konwersji UTC (lokalny czas)
 */
function formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Sprawdza czy dana data jest świętem
 */
export function isHoliday(
    date: Date | string,
    holidays: PublicHoliday[]
): PublicHoliday | undefined {
    const dateStr = typeof date === "string" ? date : formatDateLocal(date);

    return holidays.find((holiday) => holiday.date === dateStr);
}

/**
 * Pobiera nadchodzące święta (max 5)
 */
export function getUpcomingHolidays(
    holidays: PublicHoliday[],
    fromDate: Date = new Date(),
    limit: number = 5
): PublicHoliday[] {
    const today = formatDateLocal(fromDate);

    return holidays.filter((holiday) => holiday.date >= today).slice(0, limit);
}

/**
 * Grupuje święta po miesiącach
 */
export function groupHolidaysByMonth(
    holidays: PublicHoliday[]
): Map<number, PublicHoliday[]> {
    const grouped = new Map<number, PublicHoliday[]>();

    holidays.forEach((holiday) => {
        // Parse as local date to avoid timezone issues
        const month = parseInt(holiday.date.split("-")[1], 10);
        const existing = grouped.get(month) || [];
        grouped.set(month, [...existing, holiday]);
    });

    return grouped;
}

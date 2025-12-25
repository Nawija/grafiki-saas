import type { PublicHoliday, WorkingHoursResult } from "@/types";
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isWeekend,
    format,
    getYear,
    getMonth,
} from "date-fns";

const FULL_TIME_HOURS = 8;
const HALF_TIME_HOURS = 4;

/**
 * Pobiera święta z API date.nager dla danego roku i kraju
 */
export async function fetchHolidays(
    year: number,
    countryCode: string = "PL"
): Promise<PublicHoliday[]> {
    try {
        const response = await fetch(
            `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
            { next: { revalidate: 60 * 60 * 24 * 365 } } // ~rok
        );

        if (!response.ok) {
            throw new Error(`Błąd pobierania świąt: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Błąd pobierania świąt:", error);
        return [];
    }
}

/**
 * Oblicza liczbę dni roboczych i godzin pracy dla danego miesiąca
 */
export function calculateWorkingHours(
    year: number,
    month: number, // 1-12
    holidays: PublicHoliday[],
    hoursPerDay: number = FULL_TIME_HOURS
): WorkingHoursResult {
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Filtruj święta dla danego miesiąca
    const monthHolidays = holidays.filter((h) => {
        const holidayDate = new Date(h.date);
        return (
            getYear(holidayDate) === year && getMonth(holidayDate) + 1 === month
        );
    });

    const holidayDates = new Set(monthHolidays.map((h) => h.date));

    let workingDays = 0;
    let weekends = 0;

    for (const day of allDays) {
        const dateStr = format(day, "yyyy-MM-dd");

        if (isWeekend(day)) {
            weekends++;
        } else if (!holidayDates.has(dateStr)) {
            workingDays++;
        }
    }

    return {
        totalWorkingDays: workingDays,
        totalWorkingHours: workingDays * hoursPerDay,
        holidays: monthHolidays,
        weekends,
    };
}

/**
 * Oblicza wymagane godziny pracy dla danego typu etatu
 */
export function getRequiredHours(
    year: number,
    month: number,
    holidays: PublicHoliday[],
    employmentType: "full" | "half" | "custom",
    customHours?: number
): number {
    let hoursPerDay: number;

    switch (employmentType) {
        case "full":
            hoursPerDay = FULL_TIME_HOURS;
            break;
        case "half":
            hoursPerDay = HALF_TIME_HOURS;
            break;
        case "custom":
            hoursPerDay = customHours || FULL_TIME_HOURS;
            break;
        default:
            hoursPerDay = FULL_TIME_HOURS;
    }

    const result = calculateWorkingHours(year, month, holidays, hoursPerDay);
    return result.totalWorkingHours;
}

/**
 * Oblicza godziny pracy dla całego roku
 */
export async function calculateYearlyWorkingHours(
    year: number,
    employmentType: "full" | "half" | "custom",
    customHours?: number
): Promise<{
    monthly: {
        month: number;
        monthName: string;
        hours: number;
        workingDays: number;
    }[];
    total: number;
}> {
    const holidays = await fetchHolidays(year);

    const monthNames = [
        "Styczeń",
        "Luty",
        "Marzec",
        "Kwiecień",
        "Maj",
        "Czerwiec",
        "Lipiec",
        "Sierpień",
        "Wrzesień",
        "Październik",
        "Listopad",
        "Grudzień",
    ];

    const monthly = [];
    let total = 0;

    for (let month = 1; month <= 12; month++) {
        const hours = getRequiredHours(
            year,
            month,
            holidays,
            employmentType,
            customHours
        );
        const result = calculateWorkingHours(year, month, holidays);

        monthly.push({
            month,
            monthName: monthNames[month - 1],
            hours,
            workingDays: result.totalWorkingDays,
        });

        total += hours;
    }

    return { monthly, total };
}

/**
 * Oblicza przepracowane godziny z listy zmian
 */
export function calculateWorkedHours(
    shifts: { start_time: string; end_time: string; break_minutes: number }[]
): number {
    return shifts.reduce((total, shift) => {
        const [startH, startM] = shift.start_time.split(":").map(Number);
        const [endH, endM] = shift.end_time.split(":").map(Number);

        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const workedMinutes = endMinutes - startMinutes - shift.break_minutes;
        return total + workedMinutes / 60;
    }, 0);
}

/**
 * Formatuje godziny do czytelnej postaci
 */
export function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (m === 0) {
        return `${h}h`;
    }
    return `${h}h ${m}min`;
}

/**
 * Zwraca etykietę typu etatu po polsku
 */
export function getEmploymentTypeLabel(
    type: "full" | "half" | "custom"
): string {
    switch (type) {
        case "full":
            return "Pełny etat";
        case "half":
            return "½ etatu";
        case "custom":
            return "Niestandardowy";
        default:
            return type;
    }
}

// ===========================================
// POLISH HOLIDAYS & TRADING SUNDAYS
// ===========================================

import { PolishHoliday } from "@/types";
import {
    format,
    getDay,
    isWeekend,
    eachDayOfInterval,
    startOfYear,
    endOfYear,
    parseISO,
    isSunday,
    addDays,
    subDays,
} from "date-fns";

// Fixed public holidays in Poland
const FIXED_HOLIDAYS: { month: number; day: number; name: string }[] = [
    { month: 1, day: 1, name: "Nowy Rok" },
    { month: 1, day: 6, name: "Święto Trzech Króli" },
    { month: 5, day: 1, name: "Święto Pracy" },
    { month: 5, day: 3, name: "Święto Konstytucji 3 Maja" },
    { month: 8, day: 15, name: "Wniebowzięcie Najświętszej Maryi Panny" },
    { month: 11, day: 1, name: "Wszystkich Świętych" },
    { month: 11, day: 11, name: "Narodowe Święto Niepodległości" },
    { month: 12, day: 25, name: "Boże Narodzenie (pierwszy dzień)" },
    { month: 12, day: 26, name: "Boże Narodzenie (drugi dzień)" },
];

// Calculate Easter Sunday using Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month - 1, day);
}

// Get movable holidays based on Easter
function getMovableHolidays(year: number): { date: Date; name: string }[] {
    const easterSunday = getEasterSunday(year);

    return [
        { date: easterSunday, name: "Wielkanoc" },
        { date: addDays(easterSunday, 1), name: "Poniedziałek Wielkanocny" },
        { date: addDays(easterSunday, 49), name: "Zielone Świątki" },
        { date: addDays(easterSunday, 60), name: "Boże Ciało" },
    ];
}

// Get all public holidays for a year
export function getPublicHolidays(year: number): PolishHoliday[] {
    const holidays: PolishHoliday[] = [];

    // Fixed holidays
    for (const holiday of FIXED_HOLIDAYS) {
        const date = new Date(year, holiday.month - 1, holiday.day);
        holidays.push({
            date: format(date, "yyyy-MM-dd"),
            name: holiday.name,
            type: "public",
        });
    }

    // Movable holidays
    for (const holiday of getMovableHolidays(year)) {
        holidays.push({
            date: format(holiday.date, "yyyy-MM-dd"),
            name: holiday.name,
            type: "public",
        });
    }

    return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Trading Sundays in Poland (niedziele handlowe)
// As of 2024/2025, trading Sundays are:
// - Last Sunday before Easter
// - Last two Sundays before Christmas
// - First Sunday of January (during winter sales)
// - Last Sunday of January
// - Last Sunday of April
// - Last Sunday of June
// - Last Sunday of August

// Pre-computed trading Sundays for 2024-2026
const TRADING_SUNDAYS: { [year: number]: string[] } = {
    2024: [
        "2024-01-28", // Last Sunday of January
        "2024-03-24", // Last Sunday before Easter
        "2024-04-28", // Last Sunday of April
        "2024-06-30", // Last Sunday of June
        "2024-08-25", // Last Sunday of August
        "2024-12-15", // 2nd last before Christmas
        "2024-12-22", // Last before Christmas
    ],
    2025: [
        "2025-01-26", // Last Sunday of January
        "2025-04-13", // Last Sunday before Easter (Easter: April 20)
        "2025-04-27", // Last Sunday of April
        "2025-06-29", // Last Sunday of June
        "2025-08-31", // Last Sunday of August
        "2025-12-14", // 2nd last before Christmas
        "2025-12-21", // Last before Christmas
    ],
    2026: [
        "2026-01-25", // Last Sunday of January
        "2026-03-29", // Last Sunday before Easter (Easter: April 5)
        "2026-04-26", // Last Sunday of April
        "2026-06-28", // Last Sunday of June
        "2026-08-30", // Last Sunday of August
        "2026-12-13", // 2nd last before Christmas
        "2026-12-20", // Last before Christmas
    ],
};

// Dynamically calculate trading Sundays for years not in the pre-computed list
function calculateTradingSundays(year: number): string[] {
    const tradingSundays: string[] = [];
    const easterSunday = getEasterSunday(year);

    // Last Sunday before Easter
    let lastSundayBeforeEaster = subDays(easterSunday, 7);
    tradingSundays.push(format(lastSundayBeforeEaster, "yyyy-MM-dd"));

    // Last Sunday of specific months
    const tradingMonths = [1, 4, 6, 8]; // January, April, June, August
    for (const month of tradingMonths) {
        const lastDay = new Date(year, month, 0); // Last day of month
        let lastSunday = lastDay;
        while (getDay(lastSunday) !== 0) {
            lastSunday = subDays(lastSunday, 1);
        }
        tradingSundays.push(format(lastSunday, "yyyy-MM-dd"));
    }

    // Two Sundays before Christmas
    const christmas = new Date(year, 11, 25);
    let sundayBeforeChristmas = christmas;
    while (getDay(sundayBeforeChristmas) !== 0) {
        sundayBeforeChristmas = subDays(sundayBeforeChristmas, 1);
    }
    tradingSundays.push(format(sundayBeforeChristmas, "yyyy-MM-dd"));
    tradingSundays.push(
        format(subDays(sundayBeforeChristmas, 7), "yyyy-MM-dd")
    );

    return tradingSundays.sort();
}

export function getTradingSundays(year: number): string[] {
    return TRADING_SUNDAYS[year] || calculateTradingSundays(year);
}

// Check if a date is a trading Sunday
export function isTradingSunday(date: Date | string): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isSunday(dateObj)) return false;

    const year = dateObj.getFullYear();
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const tradingSundays = getTradingSundays(year);

    return tradingSundays.includes(dateStr);
}

// Check if a date is a non-trading Sunday
export function isNonTradingSunday(date: Date | string): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return isSunday(dateObj) && !isTradingSunday(dateObj);
}

// Check if a date is a public holiday
export function isPublicHoliday(date: Date | string): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const year = dateObj.getFullYear();
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const holidays = getPublicHolidays(year);

    return holidays.some((h) => h.date === dateStr);
}

// Get holiday name if date is a holiday
export function getHolidayName(date: Date | string): string | null {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    const year = dateObj.getFullYear();
    const dateStr = format(dateObj, "yyyy-MM-dd");
    const holidays = getPublicHolidays(year);

    const holiday = holidays.find((h) => h.date === dateStr);
    return holiday?.name || null;
}

// Check if date is a working day (not weekend, not public holiday, or trading Sunday)
export function isWorkingDay(
    date: Date | string,
    respectTradingSundays = true
): boolean {
    const dateObj = typeof date === "string" ? parseISO(date) : date;

    // Public holiday = not working
    if (isPublicHoliday(dateObj)) return false;

    // Saturday = not working
    if (getDay(dateObj) === 6) return false;

    // Sunday
    if (isSunday(dateObj)) {
        if (respectTradingSundays) {
            return isTradingSunday(dateObj);
        }
        return false;
    }

    return true;
}

// Count working days between two dates
export function countWorkingDays(
    startDate: Date | string,
    endDate: Date | string,
    respectTradingSundays = true
): number {
    const start =
        typeof startDate === "string" ? parseISO(startDate) : startDate;
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

    const days = eachDayOfInterval({ start, end });
    return days.filter((day) => isWorkingDay(day, respectTradingSundays))
        .length;
}

// Get all special days (holidays + trading/non-trading Sundays) for a date range
export function getSpecialDays(
    startDate: Date | string,
    endDate: Date | string
): PolishHoliday[] {
    const start =
        typeof startDate === "string" ? parseISO(startDate) : startDate;
    const end = typeof endDate === "string" ? parseISO(endDate) : endDate;

    const specialDays: PolishHoliday[] = [];
    const days = eachDayOfInterval({ start, end });

    for (const day of days) {
        const dateStr = format(day, "yyyy-MM-dd");

        // Check public holiday
        if (isPublicHoliday(day)) {
            specialDays.push({
                date: dateStr,
                name: getHolidayName(day) || "Święto",
                type: "public",
            });
        }
        // Check trading Sunday
        else if (isTradingSunday(day)) {
            specialDays.push({
                date: dateStr,
                name: "Niedziela handlowa",
                type: "trading_sunday",
            });
        }
        // Check non-trading Sunday
        else if (isNonTradingSunday(day)) {
            specialDays.push({
                date: dateStr,
                name: "Niedziela niehandlowa",
                type: "non_trading_sunday",
            });
        }
    }

    return specialDays;
}

// Get calendar data for a month with all special day information
export function getMonthCalendarData(year: number, month: number) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);

    const days = eachDayOfInterval({ start: firstDay, end: lastDay });

    return days.map((day) => ({
        date: format(day, "yyyy-MM-dd"),
        dayOfMonth: day.getDate(),
        dayOfWeek: getDay(day),
        isWeekend: isWeekend(day),
        isPublicHoliday: isPublicHoliday(day),
        holidayName: getHolidayName(day),
        isTradingSunday: isTradingSunday(day),
        isNonTradingSunday: isNonTradingSunday(day),
        isWorkingDay: isWorkingDay(day),
    }));
}

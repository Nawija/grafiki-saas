import {
    format,
    parseISO,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
} from "date-fns";
import { pl } from "date-fns/locale";

export const MONTH_NAMES = [
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

export const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Ndz"];
export const DAY_NAMES_FULL = [
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
    "Niedziela",
];

/**
 * Formatuje datę po polsku
 */
export function formatDatePL(
    date: Date | string,
    formatStr: string = "dd MMMM yyyy"
): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, formatStr, { locale: pl });
}

/**
 * Zwraca nazwę miesiąca po polsku
 */
export function getMonthName(month: number): string {
    return MONTH_NAMES[month - 1] || "";
}

/**
 * Zwraca dni tygodnia dla danej daty
 */
export function getWeekDays(date: Date): Date[] {
    const start = startOfWeek(date, { weekStartsOn: 1 }); // Tydzień zaczyna się w poniedziałek
    const end = endOfWeek(date, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
}

/**
 * Przechodzi do następnego miesiąca
 */
export function nextMonth(date: Date): Date {
    return addMonths(date, 1);
}

/**
 * Przechodzi do poprzedniego miesiąca
 */
export function prevMonth(date: Date): Date {
    return subMonths(date, 1);
}

/**
 * Generuje listę lat (obecny ± 2)
 */
export function getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];
}

/**
 * Generuje listę miesięcy
 */
export function getMonthOptions(): { value: number; label: string }[] {
    return MONTH_NAMES.map((name, index) => ({
        value: index + 1,
        label: name,
    }));
}

/**
 * Formatuje czas HH:MM
 */
export function formatTime(time: string): string {
    return time.substring(0, 5);
}

/**
 * Parsuje string czasu do minut
 */
export function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
}

/**
 * Konwertuje minuty na string czasu
 */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { WorkingHoursResult } from "@/types";
import { formatHours } from "@/lib/utils/work-hours";

const MONTHS_PL = [
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

interface WorkHoursSummaryProps {
    workHours: WorkingHoursResult;
    year: number;
    month: number;
}

export function WorkHoursSummary({
    workHours,
    year,
    month,
}: WorkHoursSummaryProps) {
    const monthName = MONTHS_PL[month - 1];
    const totalDays =
        workHours.totalWorkingDays +
        workHours.weekends +
        workHours.holidays.length;
    const fullTimeHours = workHours.totalWorkingDays * 8;
    const halfTimeHours = workHours.totalWorkingDays * 4;

    return (
        <Card>
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                    Godziny pracy - {monthName} {year}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Podsumowanie wymaganych godzin pracy w tym miesiącu
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Dni w miesiącu
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                            {totalDays}
                        </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Dni robocze
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                            {workHours.totalWorkingDays}
                        </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Weekendy
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                            {workHours.weekends}
                        </p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1">
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Święta
                        </p>
                        <p className="text-xl sm:text-2xl font-bold">
                            {workHours.holidays.length}
                        </p>
                    </div>
                </div>

                <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm">
                            Pełny etat (8h/dzień)
                        </span>
                        <span className="font-semibold text-sm sm:text-base">
                            {formatHours(fullTimeHours)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm">
                            1/2 etatu (4h/dzień)
                        </span>
                        <span className="font-semibold text-sm sm:text-base">
                            {formatHours(halfTimeHours)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm">
                            3/4 etatu (6h/dzień)
                        </span>
                        <span className="font-semibold text-sm sm:text-base">
                            {formatHours(workHours.totalWorkingDays * 6)}
                        </span>
                    </div>
                </div>

                {workHours.holidays.length > 0 && (
                    <div className="border-t pt-3 sm:pt-4">
                        <p className="text-xs sm:text-sm font-medium mb-2">
                            Święta w tym miesiącu:
                        </p>
                        <ul className="space-y-1">
                            {workHours.holidays.map((holiday) => (
                                <li
                                    key={holiday.date}
                                    className="text-xs sm:text-sm text-muted-foreground flex justify-between"
                                >
                                    <span>{holiday.localName}</span>
                                    <span>
                                        {new Date(
                                            holiday.date
                                        ).toLocaleDateString("pl-PL", {
                                            day: "numeric",
                                            month: "short",
                                        })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

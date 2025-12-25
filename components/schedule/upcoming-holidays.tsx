"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { PublicHoliday } from "@/types";
import { getUpcomingHolidays } from "@/lib/api/holidays";
import { CalendarDays } from "lucide-react";

interface UpcomingHolidaysProps {
    holidays: PublicHoliday[];
}

export function UpcomingHolidays({ holidays }: UpcomingHolidaysProps) {
    const upcoming = getUpcomingHolidays(holidays, new Date(), 5);

    return (
        <Card>
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
                    Nadchodzące święta
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Najbliższe dni wolne od pracy w Polsce
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                {upcoming.length === 0 ? (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Brak nadchodzących świąt
                    </p>
                ) : (
                    <ul className="space-y-2 sm:space-y-3">
                        {upcoming.map((holiday) => {
                            const date = new Date(holiday.date);
                            const dayOfWeek = date.toLocaleDateString("pl-PL", {
                                weekday: "long",
                            });
                            const formattedDate = date.toLocaleDateString(
                                "pl-PL",
                                {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                }
                            );

                            // Oblicz ile dni do święta
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const holidayDate = new Date(holiday.date);
                            holidayDate.setHours(0, 0, 0, 0);
                            const daysUntil = Math.ceil(
                                (holidayDate.getTime() - today.getTime()) /
                                    (1000 * 60 * 60 * 24)
                            );

                            let daysText = "";
                            if (daysUntil === 0) {
                                daysText = "Dziś";
                            } else if (daysUntil === 1) {
                                daysText = "Jutro";
                            } else {
                                daysText = `Za ${daysUntil} dni`;
                            }

                            return (
                                <li
                                    key={holiday.date}
                                    className="flex items-start justify-between border-b last:border-0 pb-2 sm:pb-3 last:pb-0"
                                >
                                    <div>
                                        <p className="font-medium text-sm sm:text-base">
                                            {holiday.localName}
                                        </p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            {formattedDate} ({dayOfWeek})
                                        </p>
                                    </div>
                                    <span className="text-xs sm:text-sm text-primary font-medium">
                                        {daysText}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}

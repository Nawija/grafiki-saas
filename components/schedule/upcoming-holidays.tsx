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
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Nadchodzące święta
                </CardTitle>
                <CardDescription>
                    Najbliższe dni wolne od pracy w Polsce
                </CardDescription>
            </CardHeader>
            <CardContent>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Brak nadchodzących świąt
                    </p>
                ) : (
                    <ul className="space-y-3">
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
                                    className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {holiday.localName}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {formattedDate} ({dayOfWeek})
                                        </p>
                                    </div>
                                    <span className="text-sm text-primary font-medium">
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

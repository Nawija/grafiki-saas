"use client";

import { useState } from "react";
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isWeekend,
    isSameDay,
    getDay,
} from "date-fns";
import { pl } from "date-fns/locale";
import { Employee, ShiftTemplate } from "@/types/database";
import { PublicHoliday } from "@/types";
import { isHoliday } from "@/lib/api/holidays";
import {
    getRequiredHours,
    calculateWorkedHours,
    formatHours,
} from "@/lib/utils/work-hours";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ShiftEditor } from "./shift-editor";

interface Shift {
    id: string;
    schedule_id: string;
    employee_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    notes: string | null;
    employee: {
        id: string;
        first_name: string;
        last_name: string;
        employment_type: "full" | "half" | "custom";
        custom_hours: number | null;
    };
}

interface ScheduleCalendarProps {
    year: number;
    month: number;
    holidays: PublicHoliday[];
    employees: Employee[];
    shifts: Shift[];
    scheduleId: string;
    shiftTemplates?: ShiftTemplate[];
}

const DAYS_PL = ["Niedz.", "Pon.", "Wt.", "Śr.", "Czw.", "Pt.", "Sob."];

export function ScheduleCalendar({
    year,
    month,
    holidays,
    employees,
    shifts,
    scheduleId,
    shiftTemplates = [],
}: ScheduleCalendarProps) {
    const [selectedCell, setSelectedCell] = useState<{
        employeeId: string;
        date: string;
    } | null>(null);

    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Oblicz przepracowane godziny dla każdego pracownika
    const employeeHours = employees.map((employee) => {
        const employeeShifts = shifts.filter(
            (s) => s.employee_id === employee.id
        );
        const workedHours = calculateWorkedHours(employeeShifts);
        const requiredHours = getRequiredHours(
            year,
            month,
            holidays,
            employee.employment_type,
            employee.custom_hours ?? undefined
        );

        return {
            ...employee,
            workedHours,
            requiredHours,
            remainingHours: requiredHours - workedHours,
        };
    });

    function getShiftForCell(
        employeeId: string,
        date: Date
    ): Shift | undefined {
        const dateStr = format(date, "yyyy-MM-dd");
        return shifts.find(
            (s) => s.employee_id === employeeId && s.date === dateStr
        );
    }

    if (employees.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                        Dodaj pracowników, aby tworzyć grafik pracy
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Harmonogram pracy</CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800">
                                <th className="border p-2 text-left sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[200px]">
                                    Pracownik
                                </th>
                                {days.map((day) => {
                                    const dayOfWeek = getDay(day);
                                    const holiday = isHoliday(day, holidays);
                                    const isWeekendDay = isWeekend(day);

                                    return (
                                        <th
                                            key={day.toISOString()}
                                            className={cn(
                                                "border p-1 text-center min-w-[60px]",
                                                isWeekendDay &&
                                                    "bg-slate-100 dark:bg-slate-700",
                                                holiday &&
                                                    "bg-red-50 dark:bg-red-950"
                                            )}
                                        >
                                            <div className="text-xs text-muted-foreground">
                                                {DAYS_PL[dayOfWeek]}
                                            </div>
                                            <div className="font-semibold">
                                                {format(day, "d")}
                                            </div>
                                            {holiday && (
                                                <div
                                                    className="text-[10px] text-red-600 dark:text-red-400 truncate"
                                                    title={holiday.localName}
                                                >
                                                    {holiday.localName.substring(
                                                        0,
                                                        10
                                                    )}
                                                    ...
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                                <th className="border p-2 text-center min-w-[100px]">
                                    Suma
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {employeeHours.map((employee) => (
                                <tr
                                    key={employee.id}
                                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                                >
                                    <td className="border p-2 sticky left-0 bg-white dark:bg-slate-900 z-10">
                                        <div className="font-medium">
                                            {employee.first_name}{" "}
                                            {employee.last_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatHours(employee.workedHours)}{" "}
                                            /{" "}
                                            {formatHours(
                                                employee.requiredHours
                                            )}
                                        </div>
                                    </td>
                                    {days.map((day) => {
                                        const shift = getShiftForCell(
                                            employee.id,
                                            day
                                        );
                                        const isWeekendDay = isWeekend(day);
                                        const holiday = isHoliday(
                                            day,
                                            holidays
                                        );
                                        const dateStr = format(
                                            day,
                                            "yyyy-MM-dd"
                                        );

                                        return (
                                            <td
                                                key={day.toISOString()}
                                                className={cn(
                                                    "border p-1 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors",
                                                    isWeekendDay &&
                                                        "bg-slate-50 dark:bg-slate-800",
                                                    holiday &&
                                                        "bg-red-50/50 dark:bg-red-950/50"
                                                )}
                                                onClick={() =>
                                                    setSelectedCell({
                                                        employeeId: employee.id,
                                                        date: dateStr,
                                                    })
                                                }
                                            >
                                                {shift ? (
                                                    <div className="text-xs">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] px-1"
                                                        >
                                                            {shift.start_time.substring(
                                                                0,
                                                                5
                                                            )}
                                                            -
                                                            {shift.end_time.substring(
                                                                0,
                                                                5
                                                            )}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-600">
                                                        -
                                                    </span>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="border p-2 text-center">
                                        <div
                                            className={cn(
                                                "font-semibold",
                                                employee.remainingHours > 0 &&
                                                    "text-orange-600",
                                                employee.remainingHours < 0 &&
                                                    "text-red-600",
                                                employee.remainingHours === 0 &&
                                                    "text-green-600"
                                            )}
                                        >
                                            {formatHours(employee.workedHours)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {employee.remainingHours > 0
                                                ? `Brakuje: ${formatHours(
                                                      employee.remainingHours
                                                  )}`
                                                : employee.remainingHours < 0
                                                ? `Nadgodziny: ${formatHours(
                                                      Math.abs(
                                                          employee.remainingHours
                                                      )
                                                  )}`
                                                : "OK"}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {selectedCell && (
                <ShiftEditor
                    open={!!selectedCell}
                    onOpenChange={(open) => !open && setSelectedCell(null)}
                    scheduleId={scheduleId}
                    employeeId={selectedCell.employeeId}
                    date={selectedCell.date}
                    existingShift={shifts.find(
                        (s) =>
                            s.employee_id === selectedCell.employeeId &&
                            s.date === selectedCell.date
                    )}
                    employee={
                        employees.find((e) => e.id === selectedCell.employeeId)!
                    }
                    templates={shiftTemplates}
                />
            )}
        </>
    );
}

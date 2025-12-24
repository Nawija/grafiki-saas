"use client";

import { useState, useMemo, useCallback } from "react";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    getDay,
    isSunday,
} from "date-fns";
import { pl } from "date-fns/locale";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    User,
    Plus,
    MoreHorizontal,
    Sun,
    Moon,
    Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Employee, ShiftWithEmployee } from "@/types";
import { getEmployeeFullName } from "@/types";
import { isTradingSunday } from "@/lib/polish-holidays";

interface MonthlyCalendarProps {
    shifts: ShiftWithEmployee[];
    employees: Employee[];
    currentDate: Date;
    onDateChange: (date: Date) => void;
    onDayClick: (date: Date) => void;
    onShiftClick: (shift: ShiftWithEmployee) => void;
    onAddShift: (date: Date) => void;
}

const DAY_NAMES = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];

function getShiftTimeIcon(startTime: string) {
    const hour = parseInt(startTime.split(":")[0]);
    if (hour < 12) return Sun;
    if (hour < 18) return Coffee;
    return Moon;
}

function getShiftDuration(
    startTime: string,
    endTime: string,
    breakMinutes: number = 0
): string {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60;
    }

    const totalMinutes = endMinutes - startMinutes - breakMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function MonthlyCalendar({
    shifts,
    employees,
    currentDate,
    onDateChange,
    onDayClick,
    onShiftClick,
    onAddShift,
}: MonthlyCalendarProps) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // Group shifts by date
    const shiftsByDate = useMemo(() => {
        const map = new Map<string, ShiftWithEmployee[]>();
        for (const shift of shifts) {
            const dateKey = shift.date;
            const existing = map.get(dateKey) || [];
            existing.push(shift);
            map.set(dateKey, existing);
        }
        return map;
    }, [shifts]);

    // Calculate daily stats
    const getDayStats = useCallback(
        (dateStr: string) => {
            const dayShifts = shiftsByDate.get(dateStr) || [];
            const totalHours = dayShifts.reduce((sum, shift) => {
                const [startH, startM] = shift.start_time
                    .split(":")
                    .map(Number);
                const [endH, endM] = shift.end_time.split(":").map(Number);
                let minutes = endH * 60 + endM - (startH * 60 + startM);
                if (minutes < 0) minutes += 24 * 60;
                return sum + (minutes - (shift.break_duration || 0)) / 60;
            }, 0);
            return {
                shiftsCount: dayShifts.length,
                totalHours: Math.round(totalHours * 10) / 10,
            };
        },
        [shiftsByDate]
    );

    const goToPrevMonth = () => onDateChange(subMonths(currentDate, 1));
    const goToNextMonth = () => onDateChange(addMonths(currentDate, 1));
    const goToToday = () => onDateChange(new Date());

    return (
        <Card className="border-0 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 rounded-t-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <CardTitle className="text-2xl font-bold capitalize">
                            {format(currentDate, "LLLL yyyy", { locale: pl })}
                        </CardTitle>
                        <Badge variant="outline" className="font-normal">
                            {shifts.length} zmian
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Dziś
                        </Button>
                        <div className="flex items-center border rounded-lg">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToPrevMonth}
                                className="rounded-r-none"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={goToNextMonth}
                                className="rounded-l-none"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/50 border-b">
                    {DAY_NAMES.map((day, index) => (
                        <div
                            key={day}
                            className={cn(
                                "py-3 text-center text-sm font-medium",
                                index === 0
                                    ? "text-red-500"
                                    : "text-slate-600 dark:text-slate-400"
                            )}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                    {days.map((day, index) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const dayShifts = shiftsByDate.get(dateStr) || [];
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isTodayDate = isToday(day);
                        const isSundayDate = isSunday(day);
                        const isTradingSundayDate =
                            isSundayDate && isTradingSunday(day);
                        const isNonTradingSunday =
                            isSundayDate && !isTradingSundayDate;
                        const stats = getDayStats(dateStr);

                        return (
                            <div
                                key={dateStr}
                                onClick={() => onDayClick(day)}
                                className={cn(
                                    "min-h-[120px] border-b border-r p-1 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                    !isCurrentMonth &&
                                        "bg-slate-50/50 dark:bg-slate-900/50",
                                    isTodayDate &&
                                        "bg-blue-50/50 dark:bg-blue-950/20",
                                    isNonTradingSunday &&
                                        "bg-red-50/30 dark:bg-red-950/10",
                                    index % 7 === 0 && "border-l-0"
                                )}
                            >
                                {/* Day number and indicators */}
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-1">
                                        <span
                                            className={cn(
                                                "flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full",
                                                isTodayDate &&
                                                    "bg-blue-600 text-white",
                                                !isTodayDate &&
                                                    !isCurrentMonth &&
                                                    "text-slate-400 dark:text-slate-600",
                                                !isTodayDate &&
                                                    isCurrentMonth &&
                                                    isSundayDate &&
                                                    "text-red-500",
                                                !isTodayDate &&
                                                    isCurrentMonth &&
                                                    !isSundayDate &&
                                                    "text-slate-700 dark:text-slate-300"
                                            )}
                                        >
                                            {format(day, "d")}
                                        </span>
                                        {isTradingSundayDate && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] px-1 py-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                        >
                                                            H
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Niedziela handlowa
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                        {isNonTradingSunday && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[10px] px-1 py-0 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                        >
                                                            ✕
                                                        </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Niedziela niehandlowa
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {isCurrentMonth && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddShift(day);
                                            }}
                                        >
                                            <Plus className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>

                                {/* Shifts */}
                                <div className="space-y-1">
                                    {dayShifts.slice(0, 3).map((shift) => {
                                        const TimeIcon = getShiftTimeIcon(
                                            shift.start_time
                                        );
                                        const employeeName = shift.employee
                                            ? `${
                                                  shift.employee.first_name
                                              } ${shift.employee.last_name.charAt(
                                                  0
                                              )}.`
                                            : "—";

                                        return (
                                            <TooltipProvider key={shift.id}>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onShiftClick(
                                                                    shift
                                                                );
                                                            }}
                                                            className={cn(
                                                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-all hover:ring-2 hover:ring-offset-1",
                                                                "hover:ring-blue-500"
                                                            )}
                                                            style={{
                                                                backgroundColor:
                                                                    shift
                                                                        .employee
                                                                        ?.color
                                                                        ? `${shift.employee.color}20`
                                                                        : "#e2e8f0",
                                                                borderLeft: `3px solid ${
                                                                    shift
                                                                        .employee
                                                                        ?.color ||
                                                                    "#94a3b8"
                                                                }`,
                                                            }}
                                                        >
                                                            <TimeIcon className="w-3 h-3 shrink-0 text-slate-500" />
                                                            <span className="truncate font-medium">
                                                                {employeeName}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500 ml-auto">
                                                                {shift.start_time.slice(
                                                                    0,
                                                                    5
                                                                )}
                                                            </span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                        side="top"
                                                        className="max-w-xs"
                                                    >
                                                        <div className="space-y-1">
                                                            <p className="font-medium">
                                                                {shift.employee
                                                                    ? `${shift.employee.first_name} ${shift.employee.last_name}`
                                                                    : "Nieprzypisane"}
                                                            </p>
                                                            <p className="text-xs flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {shift.start_time.slice(
                                                                    0,
                                                                    5
                                                                )}{" "}
                                                                -{" "}
                                                                {shift.end_time.slice(
                                                                    0,
                                                                    5
                                                                )}
                                                                <span className="text-muted-foreground">
                                                                    (
                                                                    {getShiftDuration(
                                                                        shift.start_time,
                                                                        shift.end_time,
                                                                        shift.break_duration
                                                                    )}
                                                                    )
                                                                </span>
                                                            </p>
                                                            {shift.position && (
                                                                <p className="text-xs text-muted-foreground">
                                                                    Stanowisko:{" "}
                                                                    {
                                                                        shift.position
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        );
                                    })}

                                    {dayShifts.length > 3 && (
                                        <div className="text-[10px] text-muted-foreground pl-1">
                                            +{dayShifts.length - 3} więcej
                                        </div>
                                    )}
                                </div>

                                {/* Day stats */}
                                {dayShifts.length > 0 && (
                                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                            <span>
                                                {stats.shiftsCount} zmian
                                            </span>
                                            <span>{stats.totalHours}h</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

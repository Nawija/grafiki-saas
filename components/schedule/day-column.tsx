"use client";

import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortableShiftCard } from "./shift-card";
import { Plus } from "lucide-react";
import type { Shift, Employee, ScheduleDay } from "@/types";

interface DayColumnProps {
    day: ScheduleDay;
    shifts: Shift[];
    employees: Map<string, Employee>;
    onAddShift: (date: string) => void;
    onEditShift: (shift: Shift) => void;
    onDeleteShift: (shiftId: string) => void;
    onDuplicateShift: (shift: Shift) => void;
    compact?: boolean;
}

const dayNames = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];
const fullDayNames = [
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
    "Piątek",
    "Sobota",
];

export function DayColumn({
    day,
    shifts,
    employees,
    onAddShift,
    onEditShift,
    onDeleteShift,
    onDuplicateShift,
    compact = false,
}: DayColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${day.date}`,
        data: { date: day.date, type: "day" },
    });

    const dayDate = new Date(day.date);
    const dayOfMonth = dayDate.getDate();
    const dayOfWeek = dayDate.getDay();

    // Determine day status styling
    const isNonWorkingDay = day.isHoliday || day.isNonTradingSunday;
    const isSpecialDay = day.isTradingSunday || day.isHoliday;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col rounded-lg border bg-card transition-colors min-h-[120px]",
                isOver && "border-primary bg-primary/5",
                day.isToday && "ring-2 ring-primary ring-offset-2",
                isNonWorkingDay && "bg-muted/30",
                day.isWeekend && !day.isTradingSunday && "bg-muted/20"
            )}
        >
            {/* Day header */}
            <div
                className={cn(
                    "flex items-center justify-between border-b px-2 py-1.5",
                    day.isToday && "bg-primary text-primary-foreground",
                    isNonWorkingDay && !day.isToday && "bg-muted"
                )}
            >
                <div className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            "text-xs font-medium",
                            !day.isToday && "text-muted-foreground"
                        )}
                    >
                        {dayNames[dayOfWeek]}
                    </span>
                    <span
                        className={cn(
                            "text-sm font-bold",
                            day.isToday
                                ? "text-primary-foreground"
                                : "text-foreground"
                        )}
                    >
                        {dayOfMonth}
                    </span>
                </div>

                {/* Special day badges */}
                <div className="flex items-center gap-1">
                    {day.isHoliday && (
                        <Badge
                            variant="destructive"
                            className="text-[9px] px-1 py-0"
                        >
                            Święto
                        </Badge>
                    )}
                    {day.isTradingSunday && (
                        <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0 bg-green-100 text-green-800"
                        >
                            Handlowa
                        </Badge>
                    )}
                    {day.isNonTradingSunday && (
                        <Badge
                            variant="secondary"
                            className="text-[9px] px-1 py-0"
                        >
                            Zamknięte
                        </Badge>
                    )}
                </div>
            </div>

            {/* Holiday name */}
            {day.holidayName && (
                <div className="border-b px-2 py-1 bg-red-50 dark:bg-red-950/20">
                    <p className="text-[10px] text-red-600 dark:text-red-400 truncate">
                        {day.holidayName}
                    </p>
                </div>
            )}

            {/* Shifts list */}
            <div className="flex-1 p-1.5 space-y-1.5">
                <SortableContext
                    items={shifts.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {shifts.map((shift) => (
                        <SortableShiftCard
                            key={shift.id}
                            id={shift.id}
                            shift={shift}
                            employee={employees.get(shift.employee_id)}
                            onEdit={onEditShift}
                            onDelete={onDeleteShift}
                            onDuplicate={onDuplicateShift}
                            compact={compact}
                        />
                    ))}
                </SortableContext>

                {/* Empty state / Add button */}
                {shifts.length === 0 && !isNonWorkingDay && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-16 border-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary/50"
                        onClick={() => onAddShift(day.date)}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Dodaj zmianę
                    </Button>
                )}

                {/* Add more shifts button */}
                {shifts.length > 0 && !isNonWorkingDay && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-8 text-xs text-muted-foreground hover:text-foreground opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => onAddShift(day.date)}
                    >
                        <Plus className="h-3 w-3 mr-1" />
                        Dodaj
                    </Button>
                )}

                {/* Non-working day message */}
                {isNonWorkingDay && shifts.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                        {day.isHoliday ? "Święto" : "Zamknięte"}
                    </div>
                )}
            </div>

            {/* Day footer with shift count */}
            {shifts.length > 0 && (
                <div className="border-t px-2 py-1 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground text-center">
                        {shifts.length}{" "}
                        {shifts.length === 1
                            ? "zmiana"
                            : shifts.length < 5
                            ? "zmiany"
                            : "zmian"}
                    </p>
                </div>
            )}
        </div>
    );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { EmployeeBadge } from "./draggable-employee";
import type { Employee, ShiftTemplate } from "@/types";
import type { LocalShift } from "./schedule-calendar-dnd";
import { Plus } from "lucide-react";

interface DroppableShiftCellProps {
    date: string; // yyyy-MM-dd
    template: ShiftTemplate;
    shifts: LocalShift[];
    employees: Employee[];
    isWeekend: boolean;
    isHoliday: boolean;
    isTradingSunday: boolean;
    onRemoveShift: (shiftId: string) => void;
    onEditShift: (shift: LocalShift) => void;
}

export function DroppableShiftCell({
    date,
    template,
    shifts,
    employees,
    isWeekend,
    isHoliday,
    isTradingSunday,
    onRemoveShift,
    onEditShift,
}: DroppableShiftCellProps) {
    const droppableId = `cell-${date}-${template.id}`;

    const { isOver, setNodeRef } = useDroppable({
        id: droppableId,
        data: {
            type: "cell",
            date,
            template,
        },
    });

    // Filtruj zmiany dla tej komórki (data + szablon przez dopasowanie czasów)
    const cellShifts = shifts.filter(
        (s) =>
            s.date === date &&
            s.start_time === template.start_time &&
            s.end_time === template.end_time
    );

    const isNonWorkingDay = (isWeekend && !isTradingSunday) || isHoliday;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "min-h-[40px] sm:min-h-[60px] p-0.5 sm:p-1 border-r border-b border-slate-200 transition-colors relative",
                isNonWorkingDay && "bg-slate-50",
                !isOver && !isNonWorkingDay && "hover:bg-slate-50/50"
            )}
        >
            <div className="flex flex-col gap-0.5 sm:gap-1">
                {cellShifts.map((shift) => {
                    const employee = employees.find(
                        (e) => e.id === shift.employee_id
                    );
                    if (!employee) return null;
                    return (
                        <EmployeeBadge
                            key={shift.id}
                            employee={employee}
                            onRemove={() => onRemoveShift(shift.id)}
                            onClick={() => onEditShift(shift)}
                        />
                    );
                })}
            </div>
            {isOver && (
                <div className="absolute inset-0 rounded border-2 border-dashed border-blue-400 text-blue-500 bg-blue-100/80 flex items-center justify-center z-10">
                    <Plus className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
            )}
        </div>
    );
}

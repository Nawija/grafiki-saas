"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { Employee } from "@/types";
import type { LocalShift } from "./schedule-calendar-dnd";

interface DraggableEmployeeProps {
    employee: Employee;
    scheduledHours: number;
    requiredHours: number;
}

export function DraggableEmployee({
    employee,
    scheduledHours,
    requiredHours,
}: DraggableEmployeeProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `employee-${employee.id}`,
            data: {
                type: "employee",
                employee,
            },
        });

    const employeeColor =
        (employee as Employee & { color?: string }).color || "#3b82f6";
    const isComplete = scheduledHours >= requiredHours && requiredHours > 0;
    const progress =
        requiredHours > 0
            ? Math.min((scheduledHours / requiredHours) * 100, 100)
            : 0;

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
              zIndex: isDragging ? 1000 : undefined,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg cursor-grab active:cursor-grabbing",
                "border shadow-sm",
                "hover:shadow transition-all",
                "select-none touch-none",
                isDragging && "invisible",
                isComplete
                    ? "bg-green-50 border-green-300 hover:border-green-400"
                    : "bg-white border-slate-200 hover:border-slate-300"
            )}
        >
            <div
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: employeeColor }}
            >
                {employee.first_name[0]}
                {employee.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                    {employee.first_name} {employee.last_name}
                </p>
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="flex-1 h-1 sm:h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                isComplete ? "bg-green-500" : "bg-blue-500"
                            )}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span
                        className={cn(
                            "text-[10px] sm:text-xs font-medium whitespace-nowrap",
                            isComplete ? "text-green-600" : "text-slate-500"
                        )}
                    >
                        {Math.round(scheduledHours)}/{requiredHours}h
                    </span>
                </div>
            </div>
        </div>
    );
}

// Mniejsza wersja do wyświetlania w komórkach grafiku - DRAGGABLE
export function EmployeeBadge({
    employee,
    shift,
    onRemove,
    onClick,
}: {
    employee: Employee;
    shift?: LocalShift;
    onRemove?: () => void;
    onClick?: () => void;
}) {
    const employeeColor =
        (employee as Employee & { color?: string }).color || "#3b82f6";

    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: shift ? `shift-${shift.id}` : `badge-${employee.id}`,
            data: {
                type: "shift",
                shift,
                employee,
            },
            disabled: !shift,
        });

    const dragStyle = transform
        ? {
              transform: CSS.Translate.toString(transform),
              zIndex: isDragging ? 1000 : undefined,
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={{
                ...dragStyle,
                backgroundColor: `${employeeColor}20`,
            }}
            {...(shift ? listeners : {})}
            {...(shift ? attributes : {})}
            onClick={!isDragging ? onClick : undefined}
            className={cn(
                "group relative flex items-center gap-0.5 sm:gap-1 px-0.5 sm:px-1.5 py-0.5 rounded transition-all",
                shift &&
                    "cursor-grab active:cursor-grabbing select-none touch-none",
                !shift && "cursor-pointer",
                isDragging && "invisible",
                "hover:ring-2 hover:ring-blue-400 hover:ring-offset-1"
            )}
        >
            <div
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: employeeColor }}
            >
                {employee.first_name[0]}
                {employee.last_name[0]}
            </div>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemove();
                    }}
                    className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm transition-all text-xs"
                >
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
            )}
        </div>
    );
}

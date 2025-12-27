"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";

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
                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing",
                "border shadow-sm",
                "hover:shadow transition-all",
                "select-none touch-none",
                isDragging && "opacity-0",
                isComplete
                    ? "bg-green-50 border-green-300 hover:border-green-400"
                    : "bg-white border-slate-200 hover:border-slate-300"
            )}
        >
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: employeeColor }}
            >
                {employee.first_name[0]}
                {employee.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                    {employee.first_name} {employee.last_name}
                </p>
                <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
                            "text-xs font-medium whitespace-nowrap",
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

// Mniejsza wersja do wyświetlania w komórkach grafiku
export function EmployeeBadge({
    employee,
    onRemove,
    onClick,
}: {
    employee: Employee;
    onRemove?: () => void;
    onClick?: () => void;
}) {
    const employeeColor =
        (employee as Employee & { color?: string }).color || "#3b82f6";

    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer",
                "hover:ring-2 hover:ring-offset-1 transition-all"
            )}
            style={{
                backgroundColor: `${employeeColor}20`,
                borderColor: employeeColor,
            }}
        >
            <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: employeeColor }}
            >
                {employee.first_name[0]}
                {employee.last_name[0]}
            </div>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500 transition-opacity text-sm"
                >
                    ×
                </button>
            )}
        </div>
    );
}

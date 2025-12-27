"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import type { Employee } from "@/types";

interface DraggableEmployeeProps {
    employee: Employee;
    isAssignedToday?: boolean;
}

export function DraggableEmployee({
    employee,
    isAssignedToday = false,
}: DraggableEmployeeProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `employee-${employee.id}`,
            data: {
                type: "employee",
                employee,
            },
        });

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
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing",
                "bg-white border border-slate-200 shadow-sm",
                "hover:border-slate-300 hover:shadow transition-all",
                "select-none touch-none",
                isDragging && "opacity-50 shadow-lg border-blue-400",
                isAssignedToday && "bg-green-50 border-green-200"
            )}
        >
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                    "bg-slate-100 text-slate-600"
                )}
            >
                {employee.first_name[0]}
                {employee.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                    {employee.first_name} {employee.last_name}
                </p>
                <p className="text-xs text-slate-500">
                    {employee.employment_type === "full"
                        ? "Pełny etat"
                        : employee.employment_type === "half"
                        ? "Pół etatu"
                        : `${employee.custom_hours}h/mies.`}
                </p>
            </div>
        </div>
    );
}

// Mniejsza wersja do wyświetlania w komórkach grafiku
export function EmployeeBadge({
    employee,
    onRemove,
    onClick,
    color,
}: {
    employee: Employee;
    onRemove?: () => void;
    onClick?: () => void;
    color?: string;
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "group flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                "bg-white border shadow-sm cursor-pointer",
                "hover:shadow transition-shadow"
            )}
            style={{
                borderColor: color || "#e2e8f0",
                backgroundColor: color ? `${color}15` : undefined,
            }}
        >
            <span className="font-medium truncate">
                {employee.first_name} {employee.last_name[0]}.
            </span>
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                >
                    ×
                </button>
            )}
        </div>
    );
}

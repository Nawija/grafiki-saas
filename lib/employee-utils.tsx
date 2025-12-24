// Helper components for employee display
import type { Employee } from "@/types";
import { getEmployeeFullName, getEmployeeInitials } from "@/types";

export function EmployeeName({ employee }: { employee: Employee }) {
    return <>{getEmployeeFullName(employee)}</>;
}

export function EmployeeInitialsDisplay({ employee }: { employee: Employee }) {
    return <>{getEmployeeInitials(employee)}</>;
}

// Color utilities
export function getEmployeeColorClasses(color: string) {
    // If it's a hex color, return inline style compatible classes
    if (color.startsWith("#")) {
        return {
            bg: `bg-[${color}20]`,
            text: `text-[${color}]`,
            border: `border-[${color}]`,
        };
    }
    // Legacy: if it's a tailwind class string
    return {
        bg: color.includes("bg-") ? color.split(" ")[0] : "bg-slate-100",
        text: color.includes("text-") ? color.split(" ").find(c => c.startsWith("text-")) || "text-slate-700" : "text-slate-700",
        border: "border-slate-200",
    };
}

// Get a style object for employee color
export function getEmployeeColorStyle(color: string) {
    if (color.startsWith("#")) {
        return {
            backgroundColor: `${color}20`,
            color: color,
            borderColor: color,
        };
    }
    return {};
}

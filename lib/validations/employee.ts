import { z } from "zod";

export const employeeSchema = z.object({
    firstName: z
        .string()
        .min(1, "Imię jest wymagane")
        .min(2, "Imię musi mieć minimum 2 znaki"),
    lastName: z
        .string()
        .min(1, "Nazwisko jest wymagane")
        .min(2, "Nazwisko musi mieć minimum 2 znaki"),
    email: z
        .string()
        .email("Nieprawidłowy format email")
        .optional()
        .or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    employmentType: z.enum(["full", "half", "custom"], {
        message: "Wybierz typ etatu",
    }),
    customHours: z
        .number()
        .min(1, "Minimalna liczba godzin to 1")
        .max(12, "Maksymalna liczba godzin to 12")
        .optional()
        .nullable(),
    color: z.string().min(1, "Kolor jest wymagany"),
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>;

// Aliasy dla zgodności
export type EmployeeInput = EmployeeFormData;

// Predefiniowane kolory dla pracowników
export const EMPLOYEE_COLORS = [
    "#ef4444", // red
    "#f97316", // orange
    "#f59e0b", // amber
    "#84cc16", // lime
    "#22c55e", // green
    "#14b8a6", // teal
    "#06b6d4", // cyan
    "#0ea5e9", // sky
    "#3b82f6", // blue
    "#6366f1", // indigo
    "#8b5cf6", // violet
    "#a855f7", // purple
    "#d946ef", // fuchsia
    "#ec4899", // pink
    "#f43f5e", // rose
];

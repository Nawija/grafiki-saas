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
});

export const employeeUpdateSchema = employeeSchema.partial();

export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>;

// Aliasy dla zgodności
export type EmployeeInput = EmployeeFormData;

import { z } from "zod";

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, "Email jest wymagany")
        .email("Nieprawidłowy format email"),
    password: z
        .string()
        .min(1, "Hasło jest wymagane")
        .min(6, "Hasło musi mieć minimum 6 znaków"),
});

export const registerSchema = z
    .object({
        fullName: z
            .string()
            .min(1, "Imię i nazwisko jest wymagane")
            .min(2, "Imię i nazwisko musi mieć minimum 2 znaki"),
        email: z
            .string()
            .min(1, "Email jest wymagany")
            .email("Nieprawidłowy format email"),
        password: z
            .string()
            .min(1, "Hasło jest wymagane")
            .min(6, "Hasło musi mieć minimum 6 znaków"),
        confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
    });

// Schemat dla API (bez confirmPassword)
export const registerApiSchema = z.object({
    fullName: z
        .string()
        .min(1, "Imię i nazwisko jest wymagane")
        .min(2, "Imię i nazwisko musi mieć minimum 2 znaki"),
    email: z
        .string()
        .min(1, "Email jest wymagany")
        .email("Nieprawidłowy format email"),
    password: z
        .string()
        .min(1, "Hasło jest wymagane")
        .min(6, "Hasło musi mieć minimum 6 znaków"),
});

export const verifyCodeSchema = z.object({
    email: z
        .string()
        .min(1, "Email jest wymagany")
        .email("Nieprawidłowy format email"),
    code: z
        .string()
        .min(6, "Kod musi mieć 6 cyfr")
        .max(6, "Kod musi mieć 6 cyfr")
        .regex(/^\d+$/, "Kod może zawierać tylko cyfry"),
});

export const resetPasswordSchema = z.object({
    email: z
        .string()
        .min(1, "Email jest wymagany")
        .email("Nieprawidłowy format email"),
});

export const newPasswordSchema = z
    .object({
        password: z
            .string()
            .min(1, "Hasło jest wymagane")
            .min(6, "Hasło musi mieć minimum 6 znaków"),
        confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Hasła nie są identyczne",
        path: ["confirmPassword"],
    });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

// Aliasy dla zgodności
export type LoginInput = LoginFormData;
export type RegisterInput = RegisterFormData;
export type VerifyCodeInput = VerifyCodeFormData;

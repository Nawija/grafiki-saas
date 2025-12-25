"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyCodeSchema, type VerifyCodeInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function VerifyCodeForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const email = searchParams.get("email") || "";

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<VerifyCodeInput>({
        resolver: zodResolver(verifyCodeSchema),
        defaultValues: {
            email,
            code: "",
        },
    });

    useEffect(() => {
        if (email) {
            setValue("email", email);
        }
    }, [email, setValue]);

    async function onSubmit(data: VerifyCodeInput) {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Nieprawidłowy kod weryfikacyjny");
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch {
            setError("Wystąpił błąd podczas weryfikacji");
        } finally {
            setIsLoading(false);
        }
    }

    async function handleResendCode() {
        if (!email) return;

        setIsResending(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || "Nie udało się wysłać kodu");
                return;
            }

            setSuccess("Nowy kod został wysłany na Twój email");
        } catch {
            setError("Wystąpił błąd podczas wysyłania kodu");
        } finally {
            setIsResending(false);
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/50 rounded-md">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 text-sm text-green-500 bg-green-50 dark:bg-green-950/50 rounded-md">
                    {success}
                </div>
            )}

            <input type="hidden" {...register("email")} />

            <div className="space-y-2">
                <Label htmlFor="code">Kod weryfikacyjny</Label>
                <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    disabled={isLoading}
                    className="text-center text-2xl tracking-widest"
                    {...register("code")}
                />
                {errors.code && (
                    <p className="text-sm text-red-500">
                        {errors.code.message}
                    </p>
                )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Weryfikuj
            </Button>

            <div className="text-center">
                <Button
                    type="button"
                    variant="link"
                    onClick={handleResendCode}
                    disabled={isResending || !email}
                    className="text-sm"
                >
                    {isResending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Wyślij kod ponownie
                </Button>
            </div>
        </form>
    );
}

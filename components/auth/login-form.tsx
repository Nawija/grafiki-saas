"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GoogleButton } from "./google-button";
import { Loader2 } from "lucide-react";

export function LoginForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
    });

    async function onSubmit(data: LoginInput) {
        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();
            const { error: signInError } =
                await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

            if (signInError) {
                if (signInError.message.includes("Invalid login credentials")) {
                    setError("Nieprawidłowy email lub hasło");
                } else if (
                    signInError.message.includes("Email not confirmed")
                ) {
                    setError(
                        "Email nie został potwierdzony. Sprawdź swoją skrzynkę."
                    );
                } else {
                    setError(signInError.message);
                }
                return;
            }

            router.push("/panel");
            router.refresh();
        } catch {
            setError("Wystąpił błąd podczas logowania");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <GoogleButton />

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                        lub kontynuuj z email
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="jan@example.com"
                        disabled={isLoading}
                        {...register("email")}
                    />
                    {errors.email && (
                        <p className="text-sm text-red-500">
                            {errors.email.message}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Hasło</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        {...register("password")}
                    />
                    {errors.password && (
                        <p className="text-sm text-red-500">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Zaloguj się
                </Button>
            </form>
        </div>
    );
}

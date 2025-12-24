"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

interface NewPasswordFormData {
    password: string;
    confirmPassword: string;
}

export default function ConfirmResetPasswordPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

    const form = useForm<NewPasswordFormData>({
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    useEffect(() => {
        // Check if user has valid reset session
        const checkSession = async () => {
            const supabase = createClient();
            const {
                data: { session },
            } = await supabase.auth.getSession();

            // User should have a session from the reset link
            setIsValidSession(!!session);
        };

        checkSession();
    }, []);

    const handleNewPassword = async (data: NewPasswordFormData) => {
        if (data.password !== data.confirmPassword) {
            form.setError("confirmPassword", {
                message: "Hasła nie są takie same",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const supabase = createClient();

            const { error } = await supabase.auth.updateUser({
                password: data.password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            setSuccess(true);

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                router.push("/dashboard");
            }, 3000);
        } catch (err) {
            setError("Wystąpił błąd podczas zmiany hasła");
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (isValidSession === null) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                        <p className="mt-4 text-muted-foreground">
                            Weryfikacja...
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Invalid/expired link
    if (!isValidSession) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <XCircle className="h-8 w-8 text-destructive" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold">Link wygasł</h2>
                        <p className="text-muted-foreground">
                            Ten link do resetowania hasła wygasł lub jest
                            nieprawidłowy. Poproś o nowy link.
                        </p>
                        <div className="pt-4">
                            <Link href="/reset-password">
                                <Button className="w-full">
                                    Poproś o nowy link
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Success state
    if (success) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold">Hasło zmienione!</h2>
                        <p className="text-muted-foreground">
                            Twoje hasło zostało pomyślnie zmienione. Za chwilę
                            zostaniesz przekierowany do panelu.
                        </p>
                        <div className="pt-4">
                            <Link href="/dashboard">
                                <Button className="w-full">
                                    Przejdź do panelu
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Ustaw nowe hasło</CardTitle>
                <CardDescription>
                    Wprowadź nowe hasło do swojego konta
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleNewPassword)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="password"
                            rules={{
                                required: "Hasło jest wymagane",
                                minLength: {
                                    value: 8,
                                    message: "Hasło musi mieć minimum 8 znaków",
                                },
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nowe hasło</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Minimum 8 znaków"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() =>
                                                    setShowPassword(
                                                        !showPassword
                                                    )
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            rules={{
                                required: "Potwierdź hasło",
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Potwierdź nowe hasło</FormLabel>
                                    <FormControl>
                                        <Input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Powtórz hasło"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Ustaw nowe hasło
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

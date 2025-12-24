"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, Mail, CheckCircle } from "lucide-react";

interface LoginFormData {
    email: string;
    password: string;
}

// ============================================
// GOOGLE ICON
// ============================================

function GoogleIcon() {
    return (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    );
}

// ============================================
// ERROR MESSAGES
// ============================================

const errorMessages: Record<string, string> = {
    invalid_state: "Nieprawidłowy stan sesji. Spróbuj ponownie.",
    no_code: "Brak kodu autoryzacji.",
    token_exchange: "Błąd wymiany tokena.",
    user_info: "Nie udało się pobrać danych użytkownika.",
    auth_failed: "Błąd autoryzacji.",
    signup_failed: "Nie udało się utworzyć konta.",
    callback_failed: "Błąd podczas logowania.",
    oauth_access_denied: "Odmówiono dostępu.",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const form = useForm<LoginFormData>({
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Handle URL params (errors from OAuth, success messages)
    useEffect(() => {
        const errorParam = searchParams.get("error");
        const verified = searchParams.get("verified");

        if (errorParam) {
            setError(errorMessages[errorParam] || `Błąd: ${errorParam}`);
        }
        if (verified === "true") {
            setSuccess("Email zweryfikowany! Możesz się teraz zalogować.");
        }
    }, [searchParams]);

    const handleLogin = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const supabase = createClient();
            const { error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });

            if (error) {
                if (error.message === "Invalid login credentials") {
                    setError("Nieprawidłowy email lub hasło");
                } else if (error.message === "Email not confirmed") {
                    setError(
                        "Email nie został potwierdzony. Sprawdź swoją skrzynkę."
                    );
                } else {
                    setError(error.message);
                }
                return;
            }

            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            setError("Wystąpił błąd podczas logowania");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setIsGoogleLoading(true);
        setError(null);
        setSuccess(null);
        window.location.href = "/api/auth/google";
    };

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Zaloguj się</CardTitle>
                <CardDescription>
                    Wpisz swoje dane, aby uzyskać dostęp do konta
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Success message */}
                {success && (
                    <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        {success}
                    </div>
                )}

                {/* Google login */}
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    disabled={isGoogleLoading}
                >
                    {isGoogleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <GoogleIcon />
                    )}
                    Kontynuuj z Google
                </Button>

                <div className="relative">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        lub
                    </span>
                </div>

                {/* Email login form */}
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleLogin)}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            rules={{
                                required: "Email jest wymagany",
                                pattern: {
                                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                    message: "Nieprawidłowy format email",
                                },
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                type="email"
                                                placeholder="jan@firma.pl"
                                                className="pl-10"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            rules={{ required: "Hasło jest wymagane" }}
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel>Hasło</FormLabel>
                                        <Link
                                            href="/reset-password"
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Zapomniałeś hasła?
                                        </Link>
                                    </div>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="••••••••"
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
                            Zaloguj się
                        </Button>
                    </form>
                </Form>

                <p className="text-center text-sm text-muted-foreground">
                    Nie masz konta?{" "}
                    <Link
                        href="/register"
                        className="text-primary hover:underline font-medium"
                    >
                        Zarejestruj się
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}

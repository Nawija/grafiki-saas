"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import {
    Eye,
    EyeOff,
    Loader2,
    Mail,
    User,
    CheckCircle,
    ArrowLeft,
} from "lucide-react";

interface RegisterFormData {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
}

type Step = "form" | "verify" | "success";

// ============================================
// CODE INPUT COMPONENT
// ============================================

function CodeInput({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (code: string) => void;
    disabled?: boolean;
}) {
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, digit: string) => {
        if (!/^\d*$/.test(digit)) return;

        const newCode = value.split("");
        newCode[index] = digit;
        const result = newCode.join("").slice(0, 6);
        onChange(result);

        // Auto-focus next input
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !value[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);
        onChange(pasted);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    return (
        <div className="flex gap-2 justify-center">
            {[0, 1, 2, 3, 4, 5].map((i) => (
                <Input
                    key={i}
                    ref={(el) => {
                        inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className="w-12 h-14 text-center text-2xl font-bold"
                />
            ))}
        </div>
    );
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
// MAIN COMPONENT
// ============================================

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("form");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [email, setEmail] = useState("");
    const [countdown, setCountdown] = useState(0);

    const form = useForm<RegisterFormData>({
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    // Countdown timer for resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleRegister = async (data: RegisterFormData) => {
        if (data.password !== data.confirmPassword) {
            form.setError("confirmPassword", {
                message: "Hasła nie są takie same",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Błąd rejestracji");
                return;
            }

            setEmail(data.email);
            setStep("verify");
            setCountdown(60);
        } catch (err) {
            console.error("Registration error:", err);
            setError("Wystąpił błąd podczas rejestracji");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (code.length !== 6) {
            setError("Wprowadź 6-cyfrowy kod");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Nieprawidłowy kod");
                return;
            }

            setStep("success");
        } catch (err) {
            console.error("Verification error:", err);
            setError("Wystąpił błąd weryfikacji");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (countdown > 0) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = form.getValues();
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    password: data.password,
                }),
            });

            if (res.ok) {
                setCountdown(60);
                setCode("");
            } else {
                const result = await res.json();
                setError(result.error || "Nie udało się wysłać kodu");
            }
        } catch (err) {
            setError("Wystąpił błąd");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setIsGoogleLoading(true);
        window.location.href = "/api/auth/google";
    };

    // ============================================
    // RENDER: SUCCESS
    // ============================================

    if (step === "success") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold">Konto utworzone!</h2>
                        <p className="text-muted-foreground">
                            Twoje konto zostało pomyślnie utworzone. Możesz się
                            teraz zalogować.
                        </p>
                        <div className="pt-4">
                            <Button
                                className="w-full"
                                onClick={() => router.push("/login")}
                            >
                                Przejdź do logowania
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ============================================
    // RENDER: VERIFY CODE
    // ============================================

    if (step === "verify") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-4 top-4"
                        onClick={() => setStep("form")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Wróć
                    </Button>
                    <CardTitle className="text-2xl">
                        Weryfikacja email
                    </CardTitle>
                    <CardDescription>
                        Wysłaliśmy 6-cyfrowy kod na <strong>{email}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <CodeInput
                        value={code}
                        onChange={setCode}
                        disabled={isLoading}
                    />

                    {error && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        className="w-full"
                        onClick={handleVerifyCode}
                        disabled={isLoading || code.length !== 6}
                    >
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Zweryfikuj
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Nie dostałeś kodu?{" "}
                        {countdown > 0 ? (
                            <span>Wyślij ponownie za {countdown}s</span>
                        ) : (
                            <button
                                onClick={handleResendCode}
                                disabled={isLoading}
                                className="text-primary hover:underline font-medium"
                            >
                                Wyślij ponownie
                            </button>
                        )}
                    </p>
                </CardContent>
            </Card>
        );
    }

    // ============================================
    // RENDER: REGISTRATION FORM
    // ============================================

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Utwórz konto</CardTitle>
                <CardDescription>
                    Wypełnij formularz, aby rozpocząć korzystanie z Grafiki
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Google registration */}
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

                {/* Registration form */}
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleRegister)}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                rules={{ required: "Imię jest wymagane" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Imię</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Jan"
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
                                name="lastName"
                                rules={{ required: "Nazwisko jest wymagane" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nazwisko</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Kowalski"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                            rules={{
                                required: "Hasło jest wymagane",
                                minLength: {
                                    value: 6,
                                    message: "Hasło musi mieć minimum 6 znaków",
                                },
                            }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hasło</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={
                                                    showPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                placeholder="Minimum 6 znaków"
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
                            rules={{ required: "Potwierdź hasło" }}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Potwierdź hasło</FormLabel>
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
                            Zarejestruj się
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Rejestrując się, akceptujesz{" "}
                            <Link
                                href="/terms"
                                className="text-primary hover:underline"
                            >
                                Regulamin
                            </Link>{" "}
                            i{" "}
                            <Link
                                href="/privacy"
                                className="text-primary hover:underline"
                            >
                                Politykę prywatności
                            </Link>
                        </p>
                    </form>
                </Form>

                <p className="text-center text-sm text-muted-foreground">
                    Masz już konto?{" "}
                    <Link
                        href="/login"
                        className="text-primary hover:underline font-medium"
                    >
                        Zaloguj się
                    </Link>
                </p>
            </CardContent>
        </Card>
    );
}

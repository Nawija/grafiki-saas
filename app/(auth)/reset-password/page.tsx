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
import {
    Loader2,
    Mail,
    ArrowLeft,
    CheckCircle,
    Eye,
    EyeOff,
} from "lucide-react";

interface ResetPasswordFormData {
    email: string;
}

interface NewPasswordFormData {
    password: string;
    confirmPassword: string;
}

type Step = "email" | "code" | "password" | "success";

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
// MAIN COMPONENT
// ============================================

export default function ResetPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);

    const emailForm = useForm<ResetPasswordFormData>({
        defaultValues: { email: "" },
    });

    const passwordForm = useForm<NewPasswordFormData>({
        defaultValues: { password: "", confirmPassword: "" },
    });

    // Countdown timer
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleSendCode = async (data: ResetPasswordFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: data.email }),
            });

            const result = await res.json();

            if (!res.ok) {
                setError(result.error || "Błąd wysyłania kodu");
                return;
            }

            setEmail(data.email);
            setStep("code");
            setCountdown(60);
        } catch (err) {
            setError("Wystąpił błąd podczas wysyłania kodu");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async () => {
        if (code.length !== 6) {
            setError("Wprowadź 6-cyfrowy kod");
            return;
        }

        // Just move to password step - verification happens with password change
        setError(null);
        setStep("password");
    };

    const handleChangePassword = async (data: NewPasswordFormData) => {
        if (data.password !== data.confirmPassword) {
            passwordForm.setError("confirmPassword", {
                message: "Hasła nie są takie same",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch("/api/auth/reset-password/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    code,
                    newPassword: data.password,
                }),
            });

            const result = await res.json();

            if (!res.ok) {
                if (result.error?.includes("kod")) {
                    setStep("code");
                }
                setError(result.error || "Błąd zmiany hasła");
                return;
            }

            setStep("success");
        } catch (err) {
            setError("Wystąpił błąd podczas zmiany hasła");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (countdown > 0) return;
        await handleSendCode({ email });
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
                        <h2 className="text-2xl font-bold">Hasło zmienione!</h2>
                        <p className="text-muted-foreground">
                            Twoje hasło zostało pomyślnie zmienione. Możesz się
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
    // RENDER: NEW PASSWORD
    // ============================================

    if (step === "password") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-4 top-4"
                        onClick={() => setStep("code")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Wróć
                    </Button>
                    <CardTitle className="text-2xl">Nowe hasło</CardTitle>
                    <CardDescription>
                        Ustaw nowe hasło dla swojego konta
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Form {...passwordForm}>
                        <form
                            onSubmit={passwordForm.handleSubmit(
                                handleChangePassword
                            )}
                            className="space-y-4"
                        >
                            <FormField
                                control={passwordForm.control}
                                name="password"
                                rules={{
                                    required: "Hasło jest wymagane",
                                    minLength: {
                                        value: 6,
                                        message:
                                            "Hasło musi mieć minimum 6 znaków",
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
                                control={passwordForm.control}
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
                                Zmień hasło
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        );
    }

    // ============================================
    // RENDER: VERIFY CODE
    // ============================================

    if (step === "code") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-4 top-4"
                        onClick={() => setStep("email")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Wróć
                    </Button>
                    <CardTitle className="text-2xl">Weryfikacja</CardTitle>
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
                        Kontynuuj
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
    // RENDER: EMAIL FORM
    // ============================================

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">Zapomniałeś hasła?</CardTitle>
                <CardDescription>
                    Wpisz swój email, a wyślemy Ci kod do resetowania hasła
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...emailForm}>
                    <form
                        onSubmit={emailForm.handleSubmit(handleSendCode)}
                        className="space-y-4"
                    >
                        <FormField
                            control={emailForm.control}
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
                            Wyślij kod
                        </Button>
                    </form>
                </Form>

                <Link href="/login">
                    <Button variant="ghost" className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Wróć do logowania
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

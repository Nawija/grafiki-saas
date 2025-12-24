"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<"loading" | "success" | "error">(
        "loading"
    );

    const verified = searchParams.get("verified");
    const error = searchParams.get("error");

    useEffect(() => {
        if (verified === "true") {
            setStatus("success");
        } else if (error) {
            setStatus("error");
        } else {
            setStatus("loading");
        }
    }, [verified, error]);

    if (status === "loading") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                        <h2 className="text-xl font-bold">Weryfikacja...</h2>
                        <p className="text-muted-foreground">
                            Sprawdzamy Twój email
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (status === "success") {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardContent className="pt-6">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold">
                            Email zweryfikowany!
                        </h2>
                        <p className="text-muted-foreground">
                            Twoje konto zostało aktywowane. Możesz się teraz
                            zalogować.
                        </p>
                        <div className="pt-4">
                            <Link href="/login">
                                <Button className="w-full">
                                    Przejdź do logowania
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
            <CardContent className="pt-6">
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                            <XCircle className="h-8 w-8 text-destructive" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold">Weryfikacja nieudana</h2>
                    <p className="text-muted-foreground">
                        Link weryfikacyjny wygasł lub jest nieprawidłowy.
                        Spróbuj zarejestrować się ponownie.
                    </p>
                    <div className="pt-4 space-y-2">
                        <Link href="/register">
                            <Button className="w-full">
                                Zarejestruj się ponownie
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button variant="outline" className="w-full">
                                Wróć do logowania
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

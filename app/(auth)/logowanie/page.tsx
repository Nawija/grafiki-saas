import { LoginForm } from "@/components/auth/login-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function LoginPage() {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                    Zaloguj się
                </CardTitle>
                <CardDescription className="text-center">
                    Wprowadź swoje dane, aby się zalogować
                </CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm />
                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                        Nie masz konta?{" "}
                    </span>
                    <Link
                        href="/rejestracja"
                        className="text-primary hover:underline font-medium"
                    >
                        Zarejestruj się
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

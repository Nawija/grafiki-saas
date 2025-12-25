import { RegisterForm } from "@/components/auth/register-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function RegisterPage() {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                    Utwórz konto
                </CardTitle>
                <CardDescription className="text-center">
                    Wprowadź swoje dane, aby utworzyć konto
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RegisterForm />
                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-600">Masz już konto? </span>
                    <Link
                        href="/logowanie"
                        className="text-primary hover:underline font-medium"
                    >
                        Zaloguj się
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}

import { Suspense } from "react";
import { VerifyCodeForm } from "@/components/auth/verify-code-form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

function VerifyFormLoading() {
    return (
        <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Card>
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl text-center">
                    Weryfikacja email
                </CardTitle>
                <CardDescription className="text-center">
                    Wprowadź kod wysłany na Twój adres email
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<VerifyFormLoading />}>
                    <VerifyCodeForm />
                </Suspense>
            </CardContent>
        </Card>
    );
}

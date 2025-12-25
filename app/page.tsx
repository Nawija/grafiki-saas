import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CalendarDays, Users, Clock, Shield } from "lucide-react";

const features = [
    {
        icon: CalendarDays,
        title: "Grafiki pracy",
        description:
            "Twórz i zarządzaj harmonogramami pracy dla całego zespołu",
    },
    {
        icon: Users,
        title: "Zarządzanie pracownikami",
        description: "Dodawaj pracowników z różnymi wymiarami etatu",
    },
    {
        icon: Clock,
        title: "Automatyczne obliczenia",
        description: "System automatycznie oblicza wymagane godziny pracy",
    },
    {
        icon: Shield,
        title: "Święta państwowe",
        description: "Automatyczne uwzględnianie dni wolnych od pracy",
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
            {/* Header */}
            <header className="container mx-auto px-4 py-6">
                <nav className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl">🗓️</span>
                        <span className="text-xl font-bold">Grafiki</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/logowanie">Zaloguj się</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/rejestracja">Zarejestruj się</Link>
                        </Button>
                    </div>
                </nav>
            </header>

            {/* Hero */}
            <main className="container mx-auto px-4 py-20">
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
                        Zarządzaj grafikami pracy{" "}
                        <span className="text-primary">bez stresu</span>
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
                        Prosty i intuicyjny system do tworzenia harmonogramów
                        pracy. Automatyczne obliczanie godzin, uwzględnianie
                        świąt i dni wolnych.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Button size="lg" asChild>
                            <Link href="/rejestracja">Rozpocznij za darmo</Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/logowanie">Mam już konto</Link>
                        </Button>
                    </div>
                </div>

                {/* Features */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
                    {features.map((feature) => (
                        <Card key={feature.title}>
                            <CardHeader>
                                <feature.icon className="h-10 w-10 text-primary mb-2" />
                                <CardTitle className="text-lg">
                                    {feature.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>
                                    {feature.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-20 text-center">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                Gotowy, aby uprościć zarządzanie grafikami?
                            </CardTitle>
                            <CardDescription>
                                Załóż darmowe konto i zacznij tworzyć
                                harmonogramy pracy już dziś
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button size="lg" asChild>
                                <Link href="/rejestracja">
                                    Utwórz konto za darmo
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </main>

            {/* Footer */}
            <footer className="container mx-auto px-4 py-8 mt-20 border-t">
                <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                    <p>
                        © {new Date().getFullYear()} Grafiki - System
                        harmonogramów pracy
                    </p>
                </div>
            </footer>
        </div>
    );
}

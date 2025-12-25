"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Users, Settings } from "lucide-react";
import Link from "next/link";

interface QuickActionsProps {
    hasOrganization: boolean;
}

export function QuickActions({ hasOrganization }: QuickActionsProps) {
    if (!hasOrganization) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Rozpocznij pracę z Grafikami</CardTitle>
                    <CardDescription>
                        Utwórz swoją pierwszą organizację, aby zacząć zarządzać
                        grafikami pracy
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/ustawienia?tab=organizations">
                            <Plus className="mr-2 h-4 w-4" />
                            Utwórz organizację
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const actions = [
        {
            title: "Nowy grafik",
            description: "Utwórz harmonogram pracy na nowy miesiąc",
            href: "/grafik?action=new",
            icon: CalendarDays,
        },
        {
            title: "Dodaj pracownika",
            description: "Dodaj nowego pracownika do organizacji",
            href: "/pracownicy?action=new",
            icon: Users,
        },
        {
            title: "Ustawienia",
            description: "Zarządzaj organizacjami i kontem",
            href: "/ustawienia",
            icon: Settings,
        },
    ];

    return (
        <Card>
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">
                    Szybkie akcje
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                    Najczęściej używane funkcje
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
                    {actions.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className="flex items-start gap-3 sm:gap-4 rounded-lg border p-3 sm:p-4 hover:bg-slate-50 transition-colors"
                        >
                            <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2">
                                <action.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-sm sm:text-base">
                                    {action.title}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    {action.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

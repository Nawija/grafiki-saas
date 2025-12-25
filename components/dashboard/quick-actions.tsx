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
                        <Link href="/settings?tab=organizations">
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
            href: "/schedule?action=new",
            icon: CalendarDays,
        },
        {
            title: "Dodaj pracownika",
            description: "Dodaj nowego pracownika do organizacji",
            href: "/employees?action=new",
            icon: Users,
        },
        {
            title: "Ustawienia",
            description: "Zarządzaj organizacjami i kontem",
            href: "/settings",
            icon: Settings,
        },
    ];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Szybkie akcje</CardTitle>
                <CardDescription>Najczęściej używane funkcje</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                    {actions.map((action) => (
                        <Link
                            key={action.title}
                            href={action.href}
                            className="flex items-start gap-4 rounded-lg border p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <div className="rounded-lg bg-primary/10 p-2">
                                <action.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{action.title}</p>
                                <p className="text-sm text-muted-foreground">
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

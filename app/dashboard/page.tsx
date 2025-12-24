"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Calendar,
    Users,
    Clock,
    TrendingUp,
    AlertCircle,
    Plus,
    ArrowRight,
    Loader2,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getTeamsByOrganization } from "@/lib/actions/team";
import { getEmployeesByTeam } from "@/lib/actions/employee";
import { getShiftsByDateRange } from "@/lib/actions/shift";
import { getAbsencesByTeam } from "@/lib/actions/absence";
import type { Employee, Shift, Absence, Team } from "@/types";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

interface DashboardStats {
    employeeCount: number;
    shiftsThisWeek: number;
    hoursThisMonth: number;
    pendingAbsences: number;
}

export default function DashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<DashboardStats>({
        employeeCount: 0,
        shiftsThisWeek: 0,
        hoursThisMonth: 0,
        pendingAbsences: 0,
    });
    const [todayShifts, setTodayShifts] = useState<
        { employee: Employee; shift: Shift }[]
    >([]);
    const [pendingAbsences, setPendingAbsences] = useState<
        { absence: Absence; employee: Employee }[]
    >([]);
    const [hasTeam, setHasTeam] = useState(true);

    const today = new Date();
    const formattedDate = today.toLocaleDateString("pl-PL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    useEffect(() => {
        const loadDashboardData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const supabase = createClient();
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) {
                    setError("Nie jesteś zalogowany");
                    return;
                }

                // Get user's organization
                const { data: membership } = await supabase
                    .from("organization_members")
                    .select("organization_id")
                    .eq("user_id", user.id)
                    .single();

                if (!membership) {
                    setError("Nie należysz do żadnej organizacji");
                    return;
                }

                // Get teams
                const teamsResult = await getTeamsByOrganization(
                    membership.organization_id
                );
                if (teamsResult.error || !teamsResult.data?.length) {
                    setHasTeam(false);
                    setIsLoading(false);
                    return;
                }

                const team = teamsResult.data[0];

                // Get employees
                const employeesResult = await getEmployeesByTeam(
                    team.id,
                    false
                );
                const employees = employeesResult.data || [];

                // Get today's date
                const todayStr = format(today, "yyyy-MM-dd");

                // Get this week's dates
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);

                // Get this month's dates
                const monthStart = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1
                );
                const monthEnd = new Date(
                    today.getFullYear(),
                    today.getMonth() + 1,
                    0
                );

                // Get shifts for this week
                const weekShiftsResult = await getShiftsByDateRange(
                    team.id,
                    format(weekStart, "yyyy-MM-dd"),
                    format(weekEnd, "yyyy-MM-dd")
                );
                const weekShifts = weekShiftsResult.data || [];

                // Get shifts for this month (for hours calculation)
                const monthShiftsResult = await getShiftsByDateRange(
                    team.id,
                    format(monthStart, "yyyy-MM-dd"),
                    format(monthEnd, "yyyy-MM-dd")
                );
                const monthShifts = monthShiftsResult.data || [];

                // Calculate total hours this month
                const totalHours = monthShifts.reduce((sum, shift) => {
                    const [startH, startM] = shift.start_time
                        .split(":")
                        .map(Number);
                    const [endH, endM] = shift.end_time.split(":").map(Number);
                    let hours = endH - startH + (endM - startM) / 60;
                    if (hours < 0) hours += 24; // overnight shift
                    hours -= (shift.break_duration || 0) / 60;
                    return sum + hours;
                }, 0);

                // Get absences
                const absencesResult = await getAbsencesByTeam(team.id, {
                    status: "pending",
                });
                const absences = absencesResult.data || [];

                // Filter today's shifts
                const todaysShifts = weekShifts
                    .filter((s) => s.date === todayStr)
                    .map((shift) => ({
                        employee: shift.employee,
                        shift: shift,
                    }));

                // Map pending absences with employees
                const pendingAbsencesWithEmployees = absences.map(
                    (absence) => ({
                        absence: absence,
                        employee: absence.employee,
                    })
                );

                setStats({
                    employeeCount: employees.length,
                    shiftsThisWeek: weekShifts.length,
                    hoursThisMonth: Math.round(totalHours),
                    pendingAbsences: absences.length,
                });

                setTodayShifts(todaysShifts);
                setPendingAbsences(pendingAbsencesWithEmployees);
            } catch (err) {
                console.error("Dashboard error:", err);
                setError("Wystąpił błąd podczas ładowania danych");
            } finally {
                setIsLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">Ładowanie...</p>
                </div>
            </div>
        );
    }

    if (!hasTeam) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Users className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Brak zespołu</h2>
                <p className="text-muted-foreground text-center max-w-md">
                    Nie masz jeszcze żadnego zespołu. Dokończ onboarding, aby
                    utworzyć pierwszy zespół.
                </p>
                <Button asChild>
                    <Link href="/onboarding">Dokończ konfigurację</Link>
                </Button>
            </div>
        );
    }

    const statsCards = [
        {
            title: "Pracownicy",
            value: stats.employeeCount.toString(),
            description: "aktywnych",
            icon: Users,
            href: "/dashboard/employees",
        },
        {
            title: "Zmiany w tym tygodniu",
            value: stats.shiftsThisWeek.toString(),
            description: "zaplanowanych",
            icon: Calendar,
            href: "/dashboard/schedule",
        },
        {
            title: "Godziny w tym miesiącu",
            value: stats.hoursThisMonth.toLocaleString("pl-PL"),
            description: "łącznie",
            icon: Clock,
            href: "/dashboard/schedule",
        },
        {
            title: "Nieobecności",
            value: stats.pendingAbsences.toString(),
            description: "oczekujące",
            icon: AlertCircle,
            href: "/dashboard/absences",
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground capitalize">
                        {formattedDate}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/dashboard/schedule">
                            <Calendar className="mr-2 h-4 w-4" />
                            Zobacz grafik
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Stats grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statsCards.map((stat) => (
                    <Link key={stat.title} href={stat.href}>
                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stat.value}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stat.description}
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Today's shifts */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Dzisiejsze zmiany</CardTitle>
                            <CardDescription>
                                {format(today, "EEEE, d MMMM", { locale: pl })}
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/schedule">
                                Zobacz wszystkie
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {todayShifts.length > 0 ? (
                            <div className="space-y-4">
                                {todayShifts.map(({ employee, shift }) => (
                                    <div
                                        key={shift.id}
                                        className="flex items-center justify-between rounded-lg border p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-white"
                                                style={{
                                                    backgroundColor:
                                                        employee.color,
                                                }}
                                            >
                                                {employee.first_name[0]}
                                                {employee.last_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {employee.first_name}{" "}
                                                    {employee.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {shift.position ||
                                                        employee.position}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="secondary">
                                            {shift.start_time} -{" "}
                                            {shift.end_time}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="rounded-full bg-muted p-3">
                                    <Calendar className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Brak zaplanowanych zmian na dziś
                                </p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    asChild
                                    className="mt-2"
                                >
                                    <Link href="/dashboard/schedule">
                                        Zaplanuj zmiany
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Pending absences */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Oczekujące nieobecności</CardTitle>
                            <CardDescription>
                                Wymagają zatwierdzenia
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/dashboard/absences">
                                Zarządzaj
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {pendingAbsences.length > 0 ? (
                            <div className="space-y-4">
                                {pendingAbsences
                                    .slice(0, 3)
                                    .map(({ absence, employee }) => (
                                        <div
                                            key={absence.id}
                                            className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {employee.first_name}{" "}
                                                    {employee.last_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {absence.type === "vacation"
                                                        ? "Urlop wypoczynkowy"
                                                        : absence.type ===
                                                          "sick_leave"
                                                        ? "L4"
                                                        : absence.type}{" "}
                                                    •{" "}
                                                    {format(
                                                        new Date(
                                                            absence.start_date
                                                        ),
                                                        "d.MM"
                                                    )}{" "}
                                                    -{" "}
                                                    {format(
                                                        new Date(
                                                            absence.end_date
                                                        ),
                                                        "d.MM.yyyy"
                                                    )}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                asChild
                                            >
                                                <Link href="/dashboard/absences">
                                                    Rozpatrz
                                                </Link>
                                            </Button>
                                        </div>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="rounded-full bg-muted p-3">
                                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Brak oczekujących nieobecności
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Quick actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Szybkie akcje</CardTitle>
                    <CardDescription>Często używane funkcje</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            asChild
                        >
                            <Link href="/dashboard/schedule">
                                <Calendar className="h-5 w-5" />
                                <span>Zarządzaj grafikiem</span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            asChild
                        >
                            <Link href="/dashboard/employees">
                                <Plus className="h-5 w-5" />
                                <span>Dodaj pracownika</span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            asChild
                        >
                            <Link href="/dashboard/absences">
                                <AlertCircle className="h-5 w-5" />
                                <span>Zarządzaj nieobecnościami</span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto flex-col gap-2 py-4"
                            asChild
                        >
                            <Link href="/dashboard/templates">
                                <TrendingUp className="h-5 w-5" />
                                <span>Szablony zmian</span>
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

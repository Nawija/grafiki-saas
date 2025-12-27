import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    Clock,
    ArrowRight,
    Calendar,
    BarChart3,
    CalendarDays,
    Plus,
    Sparkles,
    ChevronRight,
    Gift,
    Zap,
} from "lucide-react";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours as calculateWorkHours } from "@/lib/utils/work-hours";
import Link from "next/link";
import {
    format,
    isToday,
    isTomorrow,
    parseISO,
    differenceInDays,
} from "date-fns";
import { pl } from "date-fns/locale";

interface MembershipWithOrg {
    organization_id: string;
    organizations: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/logowanie");
    }

    // Pobierz profil użytkownika
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    const userName = profile?.full_name?.split(" ")[0] || "Użytkowniku";

    // Pobierz organizacje użytkownika
    const { data: memberships } = await supabase
        .from("organization_members")
        .select(
            `
      organization_id,
      organizations (
        id,
        name,
        slug
      )
    `
        )
        .eq("user_id", user.id);

    const typedMemberships = memberships as MembershipWithOrg[] | null;
    const organizations =
        typedMemberships?.map((m) => m.organizations).filter(Boolean) || [];
    const currentOrg =
        organizations.find((o) => o?.slug === params.org) || organizations[0];

    // Pobierz święta dla bieżącego i następnego roku
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const holidays = await fetchHolidays(currentYear);
    const nextYearHolidays = await fetchHolidays(currentYear + 1);
    const allHolidays = [...holidays, ...nextYearHolidays];

    // Oblicz godziny pracy dla bieżącego miesiąca
    const workHours = calculateWorkHours(currentYear, currentMonth, holidays);

    // Statystyki
    let employeeCount = 0;
    let totalShiftsThisMonth = 0;

    if (currentOrg) {
        const { count: empCount } = await supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", currentOrg.id)
            .eq("is_active", true);

        // Pobierz liczbę zmian w bieżącym miesiącu
        const { data: currentSchedule } = await supabase
            .from("schedules")
            .select("id")
            .eq("organization_id", currentOrg.id)
            .eq("year", currentYear)
            .eq("month", currentMonth)
            .single();

        if (currentSchedule) {
            const { count: shiftsCount } = await supabase
                .from("shifts")
                .select("*", { count: "exact", head: true })
                .eq("schedule_id", currentSchedule.id);
            totalShiftsThisMonth = shiftsCount || 0;
        }

        employeeCount = empCount || 0;
    }

    // Porę dnia do powitania
    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Dzień dobry" : hour < 18 ? "Cześć" : "Dobry wieczór";

    const currentDate = format(new Date(), "EEEE, d MMMM yyyy", { locale: pl });
    const monthName = format(new Date(), "LLLL yyyy", { locale: pl });

    // Znajdź najbliższe święto
    const today = new Date();
    const upcomingHoliday = allHolidays
        .filter((h) => parseISO(h.date) >= today)
        .sort(
            (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
        )[0];

    const daysToHoliday = upcomingHoliday
        ? differenceInDays(parseISO(upcomingHoliday.date), today)
        : null;

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-xl border bg-card p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <p className="text-muted-foreground text-sm capitalize mb-1">
                            {currentDate}
                        </p>
                        <h1 className="text-2xl font-bold">
                            {greeting}, {userName}! 👋
                        </h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {currentOrg
                                ? `Zarządzasz organizacją "${currentOrg.name}"`
                                : "Utwórz organizację, aby rozpocząć"}
                        </p>
                    </div>

                    {currentOrg && (
                        <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm">
                                <Link href="/grafik">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Otwórz grafik
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                                <Link href="/pracownicy">
                                    <Users className="mr-2 h-4 w-4" />
                                    Pracownicy
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {!currentOrg ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-3 rounded-full bg-muted mb-4">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">
                            Brak organizacji
                        </h3>
                        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                            Utwórz organizację, aby rozpocząć zarządzanie
                            grafikami.
                        </p>
                        <Button asChild>
                            <Link href="/ustawienia?tab=organizations">
                                <Plus className="mr-2 h-4 w-4" />
                                Utwórz organizację
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Pracownicy */}
                        <Link href="/pracownicy" className="group">
                            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-100">
                                            <Users className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-2xl font-bold">
                                                {employeeCount}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Pracowników
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Zmiany w tym miesiącu */}
                        <Link href="/grafik" className="group">
                            <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-slate-100">
                                            <BarChart3 className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-2xl font-bold">
                                                {totalShiftsThisMonth}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Zmian
                                            </p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>

                        {/* Godziny w miesiącu */}
                        <Card className="h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-100">
                                        <Clock className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-2xl font-bold">
                                            {workHours.totalWorkingHours}h
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Pełny etat
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Dni robocze */}
                        <Card className="h-full">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-slate-100">
                                        <CalendarDays className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-2xl font-bold">
                                            {workHours.totalWorkingDays}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Dni roboczych
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions + Holiday */}
                    <div className="grid lg:grid-cols-3 gap-4">
                        {/* Szybkie akcje */}
                        <div className="lg:col-span-2">
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                Szybkie akcje
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <Link href="/grafik" className="group">
                                    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                                <Calendar className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    Zaplanuj grafik
                                                </p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {monthName}
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardContent>
                                    </Card>
                                </Link>

                                <Link href="/pracownicy" className="group">
                                    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                                <Users className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    Zarządzaj zespołem
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {employeeCount} pracowników
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardContent>
                                    </Card>
                                </Link>

                                <Link
                                    href="/ustawienia?tab=shift-templates"
                                    className="group"
                                >
                                    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                                <Clock className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    Szablony zmian
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Konfiguruj typy zmian
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardContent>
                                    </Card>
                                </Link>

                                <Link href="/ustawienia" className="group">
                                    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                                <Sparkles className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                    Ustawienia
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Konto i preferencje
                                                </p>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>
                        </div>

                        {/* Najbliższe święto */}
                        <div>
                            <h3 className="text-sm font-medium text-muted-foreground mb-3">
                                Najbliższe święto
                            </h3>
                            {upcomingHoliday ? (
                                <Card className="h-[calc(100%-1.75rem)]">
                                    <CardContent className="p-4 h-full flex flex-col justify-between">
                                        <div>
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium mb-2">
                                                <Gift className="h-3 w-3" />
                                                {daysToHoliday === 0
                                                    ? "Dziś!"
                                                    : daysToHoliday === 1
                                                    ? "Jutro"
                                                    : `Za ${daysToHoliday} dni`}
                                            </div>
                                            <h4 className="font-semibold mb-1">
                                                {upcomingHoliday.name}
                                            </h4>
                                            <p className="text-sm text-muted-foreground capitalize">
                                                {format(
                                                    parseISO(
                                                        upcomingHoliday.date
                                                    ),
                                                    "EEEE, d MMMM",
                                                    { locale: pl }
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                            <span className="text-xl">🎉</span>
                                            <span className="text-xs text-muted-foreground">
                                                Dzień wolny
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="h-[calc(100%-1.75rem)]">
                                    <CardContent className="p-4 flex items-center justify-center h-full text-sm text-muted-foreground">
                                        Brak nadchodzących świąt
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>

                    {/* Organizacja footer */}
                    <Card>
                        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-semibold text-sm">
                                    {currentOrg.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">
                                        {currentOrg.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Twoja organizacja
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-center">
                                <div>
                                    <p className="text-lg font-bold">
                                        {employeeCount}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                        Pracowników
                                    </p>
                                </div>
                                <div className="w-px h-8 bg-border" />
                                <div>
                                    <p className="text-lg font-bold">
                                        {totalShiftsThisMonth}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                        Zmian
                                    </p>
                                </div>
                                <div className="w-px h-8 bg-border" />
                                <div>
                                    <p className="text-lg font-bold">
                                        {workHours.totalWorkingHours}h
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase">
                                        Godzin
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

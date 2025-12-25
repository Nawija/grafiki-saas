import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    CalendarDays,
    Clock,
    ShoppingBag,
    TrendingUp,
    ArrowRight,
    Sparkles,
    Calendar,
    BarChart3,
} from "lucide-react";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours as calculateWorkHours } from "@/lib/utils/work-hours";
import { UpcomingHolidays } from "@/components/schedule/upcoming-holidays";
import { WorkHoursSummary } from "@/components/schedule/work-hours-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import Link from "next/link";
import { format } from "date-fns";
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

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Hero Header */}
            <Card className="relative overflow-hidden border-0 bg-linear-to-br from-blue-100 to-pink-100 dark:from-slate-900 dark:to-slate-800">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-200/50 dark:bg-slate-700/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gray-200/50 dark:bg-gray-700/30 rounded-full blur-3xl" />

                <CardContent className="relative p-6 sm:p-8">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="capitalize">{currentDate}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-foreground">
                        {greeting}, {userName}! 👋
                    </h1>
                    <p className="text-foreground text-sm sm:text-base max-w-xl">
                        {currentOrg
                            ? `Zarządzasz organizacją "${currentOrg.name}". Sprawdź statystyki i zaplanuj grafik.`
                            : "Utwórz organizację, aby rozpocząć zarządzanie grafikami."}
                    </p>

                    {currentOrg && (
                        <div className="flex flex-wrap gap-3 mt-6">
                            <Button asChild variant="outline" size="sm">
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
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {/* Pracownicy */}
                <Link href="/pracownicy" className="group">
                    <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 group-hover:-translate-y-0.5">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">
                                {employeeCount}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Pracowników
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Zmiany w tym miesiącu */}
                <Link href="/grafik" className="group">
                    <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 group-hover:-translate-y-0.5">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <BarChart3 className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold mb-1">
                                {totalShiftsThisMonth}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Zmian w tym miesiącu
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                {/* Godziny w miesiącu */}
                <Card className="h-full">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-1">
                            {workHours.totalWorkingHours}h
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                            Godzin pełnego etatu
                        </p>
                    </CardContent>
                </Card>

                {/* Niedziele handlowe */}
                <Link href="/ustawienia?tab=org-settings" className="group">
                    <Card className="h-full transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 group-hover:-translate-y-0.5">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-3">
                                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                                    <ShoppingBag className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-lg sm:text-xl font-bold mb-1">
                                Konfiguruj
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Niedziele handlowe
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Work Hours Summary */}
                <WorkHoursSummary
                    workHours={workHours}
                    year={currentYear}
                    month={currentMonth}
                />

                {/* Upcoming Holidays */}
                <UpcomingHolidays holidays={allHolidays} />
            </div>

            {/* Quick Actions */}
            <QuickActions hasOrganization={organizations.length > 0} />
        </div>
    );
}

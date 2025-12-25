import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Users,
    CalendarDays,
    Clock,
    ShoppingBag,
    TrendingUp,
} from "lucide-react";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours as calculateWorkHours } from "@/lib/utils/work-hours";
import { UpcomingHolidays } from "@/components/schedule/upcoming-holidays";
import { WorkHoursSummary } from "@/components/schedule/work-hours-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";
import Link from "next/link";

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

    const stats = [
        {
            name: "Niedziele handlowe",
            value: "Ustaw",
            icon: ShoppingBag,
            href: "/ustawienia?tab=org-settings",
            description: "Konfiguruj",
        },
        {
            name: "Pracownicy",
            value: employeeCount,
            icon: Users,
            href: "/pracownicy",
        },
        {
            name: "Zmiany w tym miesiącu",
            value: totalShiftsThisMonth,
            icon: TrendingUp,
            href: "/grafik",
            description: "Zaplanowane",
        },
        {
            name: "Godziny w miesiącu",
            value: workHours.totalWorkingHours,
            icon: Clock,
            description: "Pełny etat",
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {currentOrg?.name || "Panel"}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    {currentOrg
                        ? "Zarządzaj grafikami i pracownikami"
                        : "Utwórz organizację, aby rozpocząć"}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {stats.map((stat) => {
                    const CardWrapper = stat.href ? Link : "div";
                    return (
                        <CardWrapper
                            key={stat.name}
                            href={stat.href || "#"}
                            className={
                                stat.href
                                    ? "block hover:opacity-80 transition-opacity"
                                    : ""
                            }
                        >
                            <Card className={stat.href ? "cursor-pointer" : ""}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-6 pb-1 sm:pb-2">
                                    <CardTitle className="text-xs sm:text-sm font-medium">
                                        {stat.name}
                                    </CardTitle>
                                    <stat.icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="p-3 sm:p-6 pt-1 sm:pt-0">
                                    <div className="text-lg sm:text-2xl font-bold">
                                        {stat.value}
                                    </div>
                                    {stat.description && (
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                                            {stat.description}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </CardWrapper>
                    );
                })}
            </div>

            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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

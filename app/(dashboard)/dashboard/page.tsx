import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Users, CalendarDays, Clock, Building2 } from "lucide-react";
import { fetchHolidays } from "@/lib/api/holidays";
import { calculateWorkingHours as calculateWorkHours } from "@/lib/utils/work-hours";
import { UpcomingHolidays } from "@/components/schedule/upcoming-holidays";
import { WorkHoursSummary } from "@/components/schedule/work-hours-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";

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
    let scheduleCount = 0;

    if (currentOrg) {
        const { count: empCount } = await supabase
            .from("employees")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", currentOrg.id)
            .eq("is_active", true);

        const { count: schCount } = await supabase
            .from("schedules")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", currentOrg.id);

        employeeCount = empCount || 0;
        scheduleCount = schCount || 0;
    }

    const stats = [
        {
            name: "Organizacje",
            value: organizations.length,
            icon: Building2,
            href: "/settings?tab=organizations",
        },
        {
            name: "Pracownicy",
            value: employeeCount,
            icon: Users,
            href: "/employees",
        },
        {
            name: "Grafiki",
            value: scheduleCount,
            icon: CalendarDays,
            href: "/schedule",
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
                    Dashboard
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    Witaj w systemie zarządzania grafikami pracy
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.name}>
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
                ))}
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

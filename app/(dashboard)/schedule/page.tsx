import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar";
import { MonthSelector } from "@/components/schedule/month-selector";
import { ShiftTemplatesManager } from "@/components/schedule/shift-templates-manager";
import { ClearScheduleButton } from "@/components/schedule/clear-schedule-button";
import { fetchHolidays } from "@/lib/api/holidays";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface MembershipWithOrg {
    organization_id: string;
    organizations: {
        id: string;
        name: string;
        slug: string;
    } | null;
}

export default async function SchedulePage({
    searchParams,
}: {
    searchParams: Promise<{ org?: string; year?: string; month?: string }>;
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

    if (!currentOrg) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Grafik
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Utwórz organizację, aby zarządzać grafikami
                    </p>
                </div>
                <Button asChild>
                    <a href="/settings?tab=organizations">
                        <Plus className="mr-2 h-4 w-4" />
                        Utwórz organizację
                    </a>
                </Button>
            </div>
        );
    }

    const organizationId = currentOrg.id;

    // Pobierz rok i miesiąc z parametrów lub użyj bieżących
    const currentDate = new Date();
    const year = params.year
        ? parseInt(params.year)
        : currentDate.getFullYear();
    const month = params.month
        ? parseInt(params.month)
        : currentDate.getMonth() + 1;

    // Pobierz święta
    const holidays = await fetchHolidays(year);

    // Pobierz pracowników
    const { data: employees } = await supabase
        .from("employees")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .order("last_name", { ascending: true });

    // Pobierz szablony zmian
    const { data: shiftTemplates } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

    // Pobierz ustawienia organizacji (niedziele handlowe)
    const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId)
        .single();

    // Pobierz lub utwórz grafik dla danego miesiąca
    let { data: schedule } = await supabase
        .from("schedules")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("year", year)
        .eq("month", month)
        .single();

    if (!schedule) {
        // Utwórz nowy grafik
        const { data: newSchedule } = await supabase
            .from("schedules")
            .insert({
                organization_id: organizationId,
                year,
                month,
            })
            .select()
            .single();

        schedule = newSchedule;
    }

    // Pobierz zmiany dla grafiku
    const { data: shifts } = await supabase
        .from("shifts")
        .select(
            `
      *,
      employee:employees (
        id,
        first_name,
        last_name,
        employment_type,
        custom_hours
      )
    `
        )
        .eq("schedule_id", schedule?.id || "");

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - responsywny */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                        Grafik pracy
                    </h1>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                        {currentOrg.name}
                    </p>
                </div>

                {/* Akcje - responsywne */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <ClearScheduleButton
                        scheduleId={schedule?.id || ""}
                        monthName={format(
                            new Date(year, month - 1),
                            "LLLL yyyy",
                            { locale: pl }
                        )}
                        shiftsCount={shifts?.length || 0}
                    />
                    <ShiftTemplatesManager
                        templates={shiftTemplates || []}
                        organizationId={organizationId}
                    />
                    <MonthSelector year={year} month={month} />
                </div>
            </div>

            <ScheduleCalendar
                year={year}
                month={month}
                holidays={holidays}
                employees={employees || []}
                shifts={shifts || []}
                scheduleId={schedule?.id || ""}
                shiftTemplates={shiftTemplates || []}
                organizationSettings={orgSettings}
            />
        </div>
    );
}

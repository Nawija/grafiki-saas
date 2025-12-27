import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { cookies } from "next/headers";

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/logowanie");
    }

    // Pobierz profil
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    // Pobierz organizacje
    const { data: memberships } = await supabase
        .from("organization_members")
        .select(
            `
      organization_id,
      organizations (
        id,
        name,
        slug,
        owner_id,
        created_at
      )
    `
        )
        .eq("user_id", user.id);

    const organizations =
        memberships?.map((m) => ({
            ...(m.organizations as {
                id: string;
                name: string;
                slug: string;
                owner_id: string;
                created_at: string;
            }),
            is_owner:
                (m.organizations as { owner_id: string }).owner_id === user.id,
        })) || [];

    // Pobierz aktualną organizację z cookie
    const cookieStore = await cookies();
    const currentOrgId = cookieStore.get("current_organization")?.value;
    const currentOrg =
        organizations.find((o) => o.id === currentOrgId) || organizations[0];

    // Pobierz szablony zmian dla aktualnej organizacji
    let shiftTemplates: Array<{
        id: string;
        organization_id: string;
        name: string;
        start_time: string;
        end_time: string;
        break_minutes: number;
        color: string;
        created_at: string;
        updated_at: string;
    }> = [];

    // Pobierz ustawienia organizacji
    let organizationSettings: {
        id: string;
        organization_id: string;
        trading_sundays_mode: "all" | "none" | "custom";
        custom_trading_sundays: string[] | null;
        default_shift_duration: number;
        default_break_minutes: number;
        created_at: string;
        updated_at: string;
    } | null = null;

    if (currentOrg) {
        const { data: templates } = await supabase
            .from("shift_templates")
            .select("*")
            .eq("organization_id", currentOrg.id)
            .order("name");

        shiftTemplates = templates || [];

        const { data: settings } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", currentOrg.id)
            .single();

        organizationSettings = settings;
    }

    const defaultTab = params.tab || "profile";

    return (
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    Ustawienia
                </h1>
                <p className="text-slate-600">
                    Zarządzaj kontem i organizacjami
                </p>
            </div>

            <SettingsTabs
                profile={profile}
                organizations={organizations}
                defaultTab={defaultTab}
                userId={user.id}
                shiftTemplates={shiftTemplates}
                currentOrganizationId={currentOrg?.id}
                organizationSettings={organizationSettings}
            />
        </div>
    );
}

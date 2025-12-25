import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsTabs } from "@/components/settings/settings-tabs";

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

    const defaultTab = params.tab || "profile";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Ustawienia
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Zarządzaj kontem i organizacjami
                </p>
            </div>

            <SettingsTabs
                profile={profile}
                organizations={organizations}
                defaultTab={defaultTab}
                userId={user.id}
            />
        </div>
    );
}

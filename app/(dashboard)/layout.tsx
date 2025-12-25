import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/header";
import type { OrganizationWithRole } from "@/types";

interface MembershipWithOrg {
    organization_id: string;
    organizations: {
        id: string;
        name: string;
        slug: string;
        owner_id: string;
        created_at: string;
    } | null;
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
        .select("*")
        .eq("id", user.id)
        .single();

    // Pobierz organizacje użytkownika
    const { data: memberships } = await supabase
        .from("organization_members")
        .select(
            `
      organization_id,
      organizations (
        id,
        name,
        slug,
        owner_id
      )
    `
        )
        .eq("user_id", user.id);

    const typedMemberships = memberships as MembershipWithOrg[] | null;
    const organizations: OrganizationWithRole[] = (typedMemberships || [])
        .filter(
            (
                m
            ): m is MembershipWithOrg & {
                organizations: NonNullable<MembershipWithOrg["organizations"]>;
            } => m.organizations !== null
        )
        .map((m) => ({
            ...m.organizations,
            is_owner: m.organizations.owner_id === user.id,
        }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <Sidebar organizations={organizations} />
            <div className="lg:pl-72">
                <Header user={profile} organizations={organizations} />
                <main className="p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}

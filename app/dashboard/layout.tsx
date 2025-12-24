import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

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
        redirect("/login");
    }

    // Check if user has completed onboarding (has an organization)
    const { data: membership } = await supabase
        .from("organization_members")
        .select(
            `
            organization_id,
            role,
            organization:organizations(name)
        `
        )
        .eq("user_id", user.id)
        .limit(1)
        .single();

    if (!membership) {
        redirect("/onboarding");
    }

    // Get user profile from metadata
    const userProfile = {
        id: user.id,
        email: user.email || "",
        fullName:
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "Użytkownik",
        avatarUrl: user.user_metadata?.avatar_url,
        organizationName:
            (membership.organization as any)?.name || "Organizacja",
        organizationId: membership.organization_id,
        role: membership.role,
    };

    return (
        <DashboardShell userProfile={userProfile}>{children}</DashboardShell>
    );
}

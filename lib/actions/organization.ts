"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
    Organization,
    OrganizationMember,
    OrganizationRole,
    OrganizationInvite,
} from "@/types";

// ============================================
// HELPERS
// ============================================

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);
}

function generateInviteToken(): string {
    return Array.from({ length: 64 }, () =>
        Math.random().toString(36).charAt(2)
    ).join("");
}

// ============================================
// GET OPERATIONS
// ============================================

export async function getUserOrganizations(): Promise<{
    data: Organization[] | null;
    error: string | null;
}> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Nie jesteś zalogowany" };

    const { data, error } = await supabase
        .from("organization_members")
        .select(
            `
            organization:organizations (*)
        `
        )
        .eq("user_id", user.id);

    if (error) {
        console.error("Error fetching organizations:", error);
        return { data: null, error: error.message };
    }

    const organizations = data
        ?.map((m) => m.organization as unknown as Organization)
        .filter(Boolean);

    return { data: organizations || [], error: null };
}

export async function getOrganization(
    id: string
): Promise<{ data: Organization | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getOrganizationMembers(
    organizationId: string
): Promise<{ data: OrganizationMember[] | null; error: string | null }> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("organization_members")
        .select("*")
        .eq("organization_id", organizationId)
        .order("role", { ascending: true });

    if (error) return { data: null, error: error.message };
    return { data, error: null };
}

export async function getUserRole(
    organizationId: string
): Promise<OrganizationRole | null> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .single();

    return data?.role || null;
}

// ============================================
// CREATE OPERATIONS
// ============================================

export async function createOrganization(
    name: string
): Promise<{ data: Organization | null; error: string | null }> {
    const supabase = await createClient();
    // Use admin client to bypass RLS for initial organization creation
    const adminClient = createAdminClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Nie jesteś zalogowany" };

    // Generate unique slug
    let slug = generateSlug(name);
    let attempts = 0;

    while (attempts < 5) {
        const { data: existing } = await adminClient
            .from("organizations")
            .select("id")
            .eq("slug", slug)
            .single();

        if (!existing) break;
        slug = `${generateSlug(name)}-${Math.random()
            .toString(36)
            .substring(2, 6)}`;
        attempts++;
    }

    // Create organization using admin client (bypasses RLS)
    const { data: org, error: orgError } = await adminClient
        .from("organizations")
        .insert({
            name,
            slug,
            settings: {
                timezone: "Europe/Warsaw",
                default_currency: "PLN",
                week_start: "monday",
                language: "pl",
            },
        })
        .select()
        .single();

    if (orgError) {
        console.error("Error creating organization:", orgError);
        return { data: null, error: orgError.message };
    }

    // Add user as owner using admin client
    const { error: memberError } = await adminClient
        .from("organization_members")
        .insert({
            organization_id: org.id,
            user_id: user.id,
            role: "owner",
        });

    if (memberError) {
        // Rollback organization creation
        await adminClient.from("organizations").delete().eq("id", org.id);
        return { data: null, error: memberError.message };
    }

    revalidatePath("/dashboard");
    return { data: org, error: null };
}

// ============================================
// UPDATE OPERATIONS
// ============================================

export async function updateOrganization(
    id: string,
    updates: Partial<Pick<Organization, "name" | "logo_url" | "settings">>
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("organizations")
        .update(updates)
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

// ============================================
// MEMBER MANAGEMENT
// ============================================

export async function inviteMember(
    organizationId: string,
    email: string,
    role: OrganizationRole = "viewer"
): Promise<{ data: OrganizationInvite | null; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Nie jesteś zalogowany" };

    // Check if already a member
    const { data: existingMember } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id);

    // Check if already invited
    const { data: existingInvite } = await supabase
        .from("organization_invites")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString());

    if (existingInvite && existingInvite.length > 0) {
        return { data: null, error: "Zaproszenie już zostało wysłane" };
    }

    const token = generateInviteToken();

    const { data, error } = await supabase
        .from("organization_invites")
        .insert({
            organization_id: organizationId,
            email,
            role,
            token,
            invited_by: user.id,
        })
        .select()
        .single();

    if (error) return { data: null, error: error.message };

    // TODO: Send invitation email

    return { data, error: null };
}

export async function acceptInvite(
    token: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Nie jesteś zalogowany" };

    // Find invite
    const { data: invite, error: findError } = await supabase
        .from("organization_invites")
        .select("*")
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

    if (findError || !invite) {
        return { error: "Nieprawidłowe lub wygasłe zaproszenie" };
    }

    // Check if email matches
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
        return { error: "Zaproszenie jest dla innego adresu email" };
    }

    // Add as member
    const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
            organization_id: invite.organization_id,
            user_id: user.id,
            role: invite.role,
            invited_by: invite.invited_by,
        });

    if (memberError) return { error: memberError.message };

    // Mark invite as accepted
    await supabase
        .from("organization_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

    revalidatePath("/dashboard");
    return { error: null };
}

export async function updateMemberRole(
    memberId: string,
    newRole: OrganizationRole
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", memberId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

export async function removeMember(
    memberId: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

// ============================================
// DELETE OPERATIONS
// ============================================

export async function deleteOrganization(
    id: string
): Promise<{ error: string | null }> {
    const supabase = await createClient();

    // This will cascade delete all related data
    const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", id);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return { error: null };
}

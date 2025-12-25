"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrganizationWithRole } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/validations/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Building2, Trash2, Loader2 } from "lucide-react";

interface OrganizationsSettingsProps {
    organizations: OrganizationWithRole[];
    userId: string;
}

export function OrganizationsSettings({
    organizations,
    userId,
}: OrganizationsSettingsProps) {
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleCreate() {
        if (!newOrgName.trim()) return;

        setIsCreating(true);

        try {
            const supabase = createClient();
            const slug =
                generateSlug(newOrgName) + "-" + Date.now().toString(36);

            // Utwórz organizację
            const { data: org, error: orgError } = await supabase
                .from("organizations")
                .insert({
                    name: newOrgName,
                    slug,
                    owner_id: userId,
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // Dodaj właściciela jako członka
            const { error: memberError } = await supabase
                .from("organization_members")
                .insert({
                    organization_id: org.id,
                    user_id: userId,
                });

            if (memberError) throw memberError;

            setNewOrgName("");
            setDialogOpen(false);
            router.refresh();
        } catch (error: unknown) {
            const err = error as {
                message?: string;
                code?: string;
                details?: string;
            };
            console.error("Error creating organization:", {
                message: err?.message,
                code: err?.code,
                details: err?.details,
                error,
            });
            alert(
                `Błąd: ${err?.message || "Nie udało się utworzyć organizacji"}`
            );
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(orgId: string) {
        setDeletingId(orgId);

        try {
            const supabase = createClient();

            // Usuń członków
            await supabase
                .from("organization_members")
                .delete()
                .eq("organization_id", orgId);

            // Usuń organizację
            const { error } = await supabase
                .from("organizations")
                .delete()
                .eq("id", orgId);

            if (error) throw error;

            router.refresh();
        } catch (error) {
            console.error("Error deleting organization:", error);
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Twoje organizacje</CardTitle>
                        <CardDescription>
                            Zarządzaj organizacjami, do których należysz
                        </CardDescription>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nowa organizacja
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Utwórz organizację</DialogTitle>
                                <DialogDescription>
                                    Wprowadź nazwę nowej organizacji
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName">
                                        Nazwa organizacji
                                    </Label>
                                    <Input
                                        id="orgName"
                                        placeholder="np. Restauracja Pod Złotym Lwem"
                                        value={newOrgName}
                                        onChange={(e) =>
                                            setNewOrgName(e.target.value)
                                        }
                                        disabled={isCreating}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                        disabled={isCreating}
                                    >
                                        Anuluj
                                    </Button>
                                    <Button
                                        onClick={handleCreate}
                                        disabled={
                                            isCreating || !newOrgName.trim()
                                        }
                                    >
                                        {isCreating && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        Utwórz
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {organizations.length === 0 ? (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">
                                Nie należysz jeszcze do żadnej organizacji
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Utwórz swoją pierwszą organizację, aby zacząć
                                zarządzać grafikami
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {organizations.map((org) => (
                                <div
                                    key={org.id}
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Building2 className="h-8 w-8 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">
                                                {org.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Utworzono:{" "}
                                                {new Date(
                                                    org.created_at
                                                ).toLocaleDateString("pl-PL")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {org.is_owner && (
                                            <Badge variant="secondary">
                                                Właściciel
                                            </Badge>
                                        )}
                                        {org.is_owner && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    handleDelete(org.id)
                                                }
                                                disabled={deletingId === org.id}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                {deletingId === org.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

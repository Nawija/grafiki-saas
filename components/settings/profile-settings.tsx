"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

interface ProfileSettingsProps {
    profile: Profile | null;
}

export function ProfileSettings({ profile }: ProfileSettingsProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || "");
    const [success, setSuccess] = useState(false);

    const initials =
        profile?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() ||
        profile?.email?.[0].toUpperCase() ||
        "U";

    async function handleSave() {
        setIsLoading(true);
        setSuccess(false);

        try {
            const supabase = createClient();

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: fullName,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", profile?.id || "");

            if (error) throw error;

            setSuccess(true);
            router.refresh();
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informacje o profilu</CardTitle>
                    <CardDescription>
                        Zaktualizuj swoje dane osobowe
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage
                                src={profile?.avatar_url || undefined}
                            />
                            <AvatarFallback className="text-2xl">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">
                                {profile?.full_name || "Brak nazwy"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {profile?.email}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profile?.email || ""}
                                disabled
                                className="bg-slate-50 dark:bg-slate-800"
                            />
                            <p className="text-xs text-muted-foreground">
                                Email nie może być zmieniony
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fullName">Imię i nazwisko</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {success && (
                        <p className="text-sm text-green-600">
                            Profil został zaktualizowany
                        </p>
                    )}

                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Zapisz zmiany
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

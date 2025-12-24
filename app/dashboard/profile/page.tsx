"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    User,
    Mail,
    Lock,
    Save,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";

interface ProfileFormData {
    fullName: string;
    email: string;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>();

    const profileForm = useForm<ProfileFormData>({
        defaultValues: {
            fullName: "",
            email: "",
        },
    });

    const passwordForm = useForm<PasswordFormData>({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Load user data on mount
    useEffect(() => {
        const loadUser = async () => {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                profileForm.setValue(
                    "fullName",
                    user.user_metadata?.full_name || ""
                );
                profileForm.setValue("email", user.email || "");
                setUserEmail(user.email || "");
                setAvatarUrl(user.user_metadata?.avatar_url);
            }
        };

        loadUser();
    }, [profileForm]);

    const handleProfileSubmit = async (data: ProfileFormData) => {
        setIsLoadingProfile(true);
        setProfileSuccess(null);
        setProfileError(null);

        try {
            const supabase = createClient();

            // Update user metadata
            const { error: metadataError } = await supabase.auth.updateUser({
                data: { full_name: data.fullName },
            });

            if (metadataError) {
                setProfileError(metadataError.message);
                return;
            }

            // Update email if changed
            if (data.email !== userEmail) {
                const { error: emailError } = await supabase.auth.updateUser({
                    email: data.email,
                });

                if (emailError) {
                    setProfileError(emailError.message);
                    return;
                }

                setProfileSuccess(
                    "Profil zaktualizowany! Sprawdź nowy email, aby potwierdzić zmianę."
                );
            } else {
                setProfileSuccess("Profil zaktualizowany pomyślnie!");
            }

            router.refresh();
        } catch {
            setProfileError("Wystąpił błąd podczas aktualizacji profilu");
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const handlePasswordSubmit = async (data: PasswordFormData) => {
        setIsLoadingPassword(true);
        setPasswordSuccess(null);
        setPasswordError(null);

        if (data.newPassword !== data.confirmPassword) {
            setPasswordError("Hasła nie są identyczne");
            setIsLoadingPassword(false);
            return;
        }

        if (data.newPassword.length < 6) {
            setPasswordError("Hasło musi mieć minimum 6 znaków");
            setIsLoadingPassword(false);
            return;
        }

        try {
            const supabase = createClient();

            const { error } = await supabase.auth.updateUser({
                password: data.newPassword,
            });

            if (error) {
                setPasswordError(error.message);
                return;
            }

            setPasswordSuccess("Hasło zostało zmienione!");
            passwordForm.reset();
        } catch {
            setPasswordError("Wystąpił błąd podczas zmiany hasła");
        } finally {
            setIsLoadingPassword(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Profil</h1>
                <p className="text-muted-foreground">
                    Zarządzaj swoim kontem i preferencjami
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Profile Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Dane osobowe
                        </CardTitle>
                        <CardDescription>
                            Zaktualizuj swoje dane osobowe
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-4">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="text-lg">
                                    {getInitials(
                                        profileForm.watch("fullName") || "U"
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Zdjęcie profilowe jest pobierane z Google
                                    (jeśli zalogowano przez Google)
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {profileSuccess && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                    {profileSuccess}
                                </AlertDescription>
                            </Alert>
                        )}

                        {profileError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {profileError}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Form {...profileForm}>
                            <form
                                onSubmit={profileForm.handleSubmit(
                                    handleProfileSubmit
                                )}
                                className="space-y-4"
                            >
                                <FormField
                                    control={profileForm.control}
                                    name="fullName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Imię i nazwisko
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Jan Kowalski"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={profileForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        type="email"
                                                        className="pl-9"
                                                        placeholder="jan@example.com"
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormDescription>
                                                Zmiana emaila wymaga
                                                potwierdzenia
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isLoadingProfile}
                                    className="w-full"
                                >
                                    {isLoadingProfile ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Zapisywanie...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Zapisz zmiany
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Change Password */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Zmiana hasła
                        </CardTitle>
                        <CardDescription>
                            Zmień hasło do swojego konta
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {passwordSuccess && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-700">
                                    {passwordSuccess}
                                </AlertDescription>
                            </Alert>
                        )}

                        {passwordError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {passwordError}
                                </AlertDescription>
                            </Alert>
                        )}

                        <Form {...passwordForm}>
                            <form
                                onSubmit={passwordForm.handleSubmit(
                                    handlePasswordSubmit
                                )}
                                className="space-y-4"
                            >
                                <FormField
                                    control={passwordForm.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Aktualne hasło
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={passwordForm.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nowe hasło</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormDescription>
                                                Minimum 6 znaków
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={passwordForm.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Potwierdź nowe hasło
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="••••••••"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isLoadingPassword}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {isLoadingPassword ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Zmienianie...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="mr-2 h-4 w-4" />
                                            Zmień hasło
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

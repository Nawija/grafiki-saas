"use client";

import { Profile } from "@/types/database";
import { OrganizationWithRole } from "@/types";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, User, Settings, Menu } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";

interface HeaderProps {
    user: Profile | null;
    organizations?: OrganizationWithRole[];
}

export function Header({ user, organizations = [] }: HeaderProps) {
    const router = useRouter();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    async function handleLogout() {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/logowanie");
        router.refresh();
    }

    const initials =
        user?.full_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase() ||
        user?.email?.[0].toUpperCase() ||
        "U";

    return (
        <>
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:gap-x-6 sm:px-6">
                {/* Mobile menu button */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setMobileMenuOpen(true)}
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Otwórz menu</span>
                </Button>

                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-2">
                    <span className="text-xl">🗓️</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                        Grafiki
                    </span>
                </div>

                <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
                    <div className="flex flex-1" />

                    {/* User menu */}
                    <div className="flex items-center gap-x-4 lg:gap-x-6">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="relative h-9 w-9 rounded-full"
                                >
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage
                                            src={user?.avatar_url || undefined}
                                            alt={user?.full_name || "User"}
                                        />
                                        <AvatarFallback>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <div className="flex items-center justify-start gap-2 p-2">
                                    <div className="flex flex-col space-y-1 leading-none">
                                        {user?.full_name && (
                                            <p className="font-medium">
                                                {user.full_name}
                                            </p>
                                        )}
                                        {user?.email && (
                                            <p className="w-[200px] truncate text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <a
                                        href="/ustawienia"
                                        className="cursor-pointer"
                                    >
                                        <User className="mr-2 h-4 w-4" />
                                        Profil
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <a
                                        href="/ustawienia"
                                        className="cursor-pointer"
                                    >
                                        <Settings className="mr-2 h-4 w-4" />
                                        Ustawienia
                                    </a>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer text-red-600 dark:text-red-400"
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Wyloguj się
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar */}
            <MobileSidebar
                organizations={organizations}
                open={mobileMenuOpen}
                onOpenChange={setMobileMenuOpen}
            />
        </>
    );
}

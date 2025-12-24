"use client";

import { useState, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Calendar,
    Users,
    Settings,
    LayoutDashboard,
    CalendarOff,
    FileSpreadsheet,
    Menu,
    ChevronLeft,
    LogOut,
    User,
    Building2,
    Bell,
} from "lucide-react";

// User profile interface
export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
    organizationName: string;
    organizationId: string;
    role: string;
}

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isMobileOpen: boolean;
    setIsMobileOpen: (open: boolean) => void;
    userProfile: UserProfile | null;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}

const navigation = [
    {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        name: "Grafik",
        href: "/dashboard/schedule",
        icon: Calendar,
    },
    {
        name: "Pracownicy",
        href: "/dashboard/employees",
        icon: Users,
    },
    {
        name: "Nieobecności",
        href: "/dashboard/absences",
        icon: CalendarOff,
    },
    {
        name: "Szablony",
        href: "/dashboard/templates",
        icon: FileSpreadsheet,
    },
    {
        name: "Ustawienia",
        href: "/dashboard/settings",
        icon: Settings,
    },
];

function SidebarContent({ isCollapsed }: { isCollapsed: boolean }) {
    const pathname = usePathname();
    const { userProfile } = useSidebar();

    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div
                className={cn(
                    "flex h-16 items-center border-b px-4",
                    isCollapsed ? "justify-center" : "justify-start"
                )}
            >
                <Link href="/dashboard" className="flex items-center gap-2">
                    <Logo size="sm" showText={!isCollapsed} asLink={false} />
                </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-3 py-4">
                <nav className="flex flex-col gap-1">
                    {navigation.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/dashboard" &&
                                pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    isActive
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                        : "text-muted-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-5 w-5 shrink-0",
                                        isCollapsed && "h-5 w-5"
                                    )}
                                />
                                {!isCollapsed && <span>{item.name}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </ScrollArea>

            {/* Organization info (bottom) */}
            <div
                className={cn(
                    "border-t p-3",
                    isCollapsed && "flex justify-center"
                )}
            >
                {!isCollapsed ? (
                    <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {userProfile?.organizationName || "Organizacja"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {userProfile?.role === "owner"
                                    ? "Właściciel"
                                    : userProfile?.role === "admin"
                                    ? "Administrator"
                                    : userProfile?.role === "manager"
                                    ? "Kierownik"
                                    : "Członek"}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                    </div>
                )}
            </div>
        </div>
    );
}

function TopBar() {
    const router = useRouter();
    const { setIsMobileOpen, isCollapsed, setIsCollapsed, userProfile } =
        useSidebar();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    // Get initials from full name
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 lg:px-6">
            {/* Mobile menu button */}
            <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileOpen(true)}
            >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Otwórz menu</span>
            </Button>

            {/* Desktop collapse button */}
            <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <ChevronLeft
                    className={cn(
                        "h-5 w-5 transition-transform",
                        isCollapsed && "rotate-180"
                    )}
                />
                <span className="sr-only">
                    {isCollapsed ? "Rozwiń" : "Zwiń"} menu
                </span>
            </Button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Powiadomienia</span>
            </Button>

            {/* User menu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="relative h-9 w-9 rounded-full"
                    >
                        <Avatar className="h-9 w-9">
                            <AvatarImage
                                src={userProfile?.avatarUrl}
                                alt={userProfile?.fullName || "Avatar"}
                            />
                            <AvatarFallback>
                                {getInitials(userProfile?.fullName || "U")}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {userProfile?.fullName || "Użytkownik"}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {userProfile?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/profile">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profil</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Ustawienia</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive cursor-pointer"
                        onClick={handleLogout}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Wyloguj się</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
    );
}

interface DashboardShellProps {
    children: React.ReactNode;
    userProfile?: UserProfile;
}

export function DashboardShell({ children, userProfile }: DashboardShellProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <SidebarContext.Provider
            value={{
                isCollapsed,
                setIsCollapsed,
                isMobileOpen,
                setIsMobileOpen,
                userProfile: userProfile || null,
            }}
        >
            <div className="relative flex min-h-screen">
                {/* Desktop Sidebar */}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col border-r bg-background transition-all duration-300",
                        isCollapsed ? "w-[70px]" : "w-[260px]"
                    )}
                >
                    <SidebarContent isCollapsed={isCollapsed} />
                </aside>

                {/* Mobile Sidebar */}
                <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                    <SheetContent side="left" className="w-[280px] p-0">
                        <SidebarContent isCollapsed={false} />
                    </SheetContent>
                </Sheet>

                {/* Main content */}
                <div
                    className={cn(
                        "flex flex-1 flex-col transition-all duration-300",
                        isCollapsed ? "lg:pl-[70px]" : "lg:pl-[260px]"
                    )}
                >
                    <TopBar />
                    <main className="flex-1 p-4 lg:p-6">{children}</main>
                </div>
            </div>
        </SidebarContext.Provider>
    );
}

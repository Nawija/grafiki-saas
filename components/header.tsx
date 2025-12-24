import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                {/* Logo */}
                <Logo size="md" />

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    <NavLink href="#funkcje">Funkcje</NavLink>
                    <NavLink href="#automatyzacja">Automatyzacja</NavLink>
                    <NavLink href="#cennik">Cennik</NavLink>
                    <NavLink href="#kontakt">Kontakt</NavLink>
                </nav>

                {/* CTA */}
                <div className="flex items-center gap-3">
                    <Link href="/login">
                        <Button
                            variant="ghost"
                            className="hidden sm:inline-flex"
                        >
                            Zaloguj się
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button>Wypróbuj za darmo</Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="md:hidden">
                        <Menu className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </header>
    );
}

function NavLink({
    href,
    children,
}: {
    href: string;
    children: React.ReactNode;
}) {
    return (
        <Link
            href={href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
            {children}
        </Link>
    );
}

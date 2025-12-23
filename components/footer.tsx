import { CalendarDays } from "lucide-react";
import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-border/50 bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 mb-4"
                        >
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                                <CalendarDays className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold tracking-tight">
                                Grafiki
                            </span>
                        </Link>
                        <p className="text-sm text-muted-foreground max-w-xs">
                            Inteligentne planowanie grafików pracy dla zespołów
                            10-50 osób. Oszczędzaj czas i zwiększaj efektywność.
                        </p>
                    </div>

                    {/* Links */}
                    <FooterColumn
                        title="Produkt"
                        links={[
                            { label: "Funkcje", href: "#funkcje" },
                            { label: "Cennik", href: "#cennik" },
                            { label: "Integracje", href: "#" },
                            { label: "API", href: "#" },
                        ]}
                    />

                    <FooterColumn
                        title="Firma"
                        links={[
                            { label: "O nas", href: "#" },
                            { label: "Blog", href: "#" },
                            { label: "Kariera", href: "#" },
                            { label: "Kontakt", href: "#kontakt" },
                        ]}
                    />

                    <FooterColumn
                        title="Wsparcie"
                        links={[
                            { label: "Centrum pomocy", href: "#" },
                            { label: "Dokumentacja", href: "#" },
                            { label: "Status systemu", href: "#" },
                            { label: "RODO", href: "#" },
                        ]}
                    />
                </div>

                {/* Bottom */}
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/50 pt-8">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Grafiki. Wszelkie prawa
                        zastrzeżone.
                    </p>
                    <div className="flex gap-6">
                        <Link
                            href="#"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Polityka prywatności
                        </Link>
                        <Link
                            href="#"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Regulamin
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

interface FooterColumnProps {
    title: string;
    links: { label: string; href: string }[];
}

function FooterColumn({ title, links }: FooterColumnProps) {
    return (
        <div>
            <h3 className="font-semibold mb-4">{title}</h3>
            <ul className="space-y-3">
                {links.map((link) => (
                    <li key={link.label}>
                        <Link
                            href={link.href}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {link.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

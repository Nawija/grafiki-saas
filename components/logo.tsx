import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
    /** Size variant */
    size?: "sm" | "md" | "lg";
    /** Show text next to icon */
    showText?: boolean;
    /** Make logo a link to home */
    asLink?: boolean;
    /** Custom class name */
    className?: string;
}

const sizeConfig = {
    sm: {
        container: "h-8 w-8",
        icon: "h-4 w-4",
        text: "text-lg",
    },
    md: {
        container: "h-9 w-9",
        icon: "h-5 w-5",
        text: "text-xl",
    },
    lg: {
        container: "h-12 w-12",
        icon: "h-6 w-6",
        text: "text-2xl",
    },
};

export function Logo({
    size = "md",
    showText = true,
    asLink = true,
    className,
}: LogoProps) {
    const config = sizeConfig[size];

    const content = (
        <div className={cn("flex items-center gap-2.5", className)}>
            <div
                className={cn(
                    "flex items-center justify-center rounded-xl bg-primary",
                    config.container
                )}
            >
                <CalendarDays
                    className={cn("text-primary-foreground", config.icon)}
                />
            </div>
            {showText && (
                <span className={cn("font-bold tracking-tight", config.text)}>
                    Solvo
                </span>
            )}
        </div>
    );

    if (asLink) {
        return (
            <Link href="/" className="flex items-center">
                {content}
            </Link>
        );
    }

    return content;
}

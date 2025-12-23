import { Card, CardContent } from "@/components/ui/card";
import { FEATURES } from "@/lib/constants";
import { Calendar, Download, Edit, Mail, Move, Users } from "lucide-react";

const iconMap = {
    Users,
    Calendar,
    Edit,
    Mail,
    Download,
    Move,
} as const;

export function FeaturesSection() {
    return (
        <section className="py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                {/* Section Header */}
                <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                        Wszystko, czego potrzebujesz do{" "}
                        <span className="text-primary">
                            efektywnego planowania
                        </span>
                    </h2>
                    <p className="text-lg text-muted-foreground">
                        Kompleksowe narzędzie stworzone z myślą o małych i
                        średnich zespołach. Żadnych zbędnych funkcji — tylko to,
                        co naprawdę działa.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURES.map((feature) => (
                        <FeatureCard key={feature.title} {...feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}

interface FeatureCardProps {
    icon: keyof typeof iconMap;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    const Icon = iconMap[icon];

    return (
        <Card className="group border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {description}
                </p>
            </CardContent>
        </Card>
    );
}

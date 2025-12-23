import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AI_FEATURES } from "@/lib/constants";
import { Brain, CheckCircle2, Sparkles, TrendingUp, Zap } from "lucide-react";

export function AISection() {
    return (
        <section className="py-20 sm:py-28 bg-muted/30">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    {/* Left: Content */}
                    <div>
                        <Badge variant="secondary" className="mb-4 gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Inteligentna automatyzacja
                        </Badge>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            AI, które{" "}
                            <span className="text-primary">
                                planuje za Ciebie
                            </span>
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8">
                            Nasz algorytm analizuje wzorce pracy, godziny
                            otwarcia i dostępność pracowników, aby automatycznie
                            zaproponować optymalny grafik.
                        </p>

                        <div className="space-y-4">
                            {AI_FEATURES.map((feature) => (
                                <AIFeatureItem
                                    key={feature.title}
                                    {...feature}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: Visual */}
                    <div className="relative">
                        <AIVisualization />
                    </div>
                </div>
            </div>
        </section>
    );
}

function AIFeatureItem({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function AIVisualization() {
    return (
        <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                        <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Analiza AI</h3>
                        <p className="text-xs text-muted-foreground">
                            Optymalizacja grafiku w toku...
                        </p>
                    </div>
                </div>

                {/* Metrics */}
                <div className="space-y-4 mb-6">
                    <MetricBar
                        label="Pokrycie zmian"
                        value={96}
                        icon={<Zap className="h-4 w-4" />}
                    />
                    <MetricBar
                        label="Balans godzin"
                        value={92}
                        icon={<TrendingUp className="h-4 w-4" />}
                    />
                    <MetricBar
                        label="Efektywność"
                        value={88}
                        icon={<Sparkles className="h-4 w-4" />}
                    />
                </div>

                {/* Suggestion */}
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <p className="text-sm font-medium mb-1">
                                Sugestia AI
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Dodaj 1 pracownika w sobotę 14:00-18:00 dla
                                optymalnej obsługi klientów.
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface MetricBarProps {
    label: string;
    value: number;
    icon: React.ReactNode;
}

function MetricBar({ label, value, icon }: MetricBarProps) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-primary">{icon}</span>
                    {label}
                </div>
                <span className="text-sm font-semibold text-primary">
                    {value}%
                </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                    className="h-full rounded-full bg-linear-to-r from-primary/80 to-primary transition-all duration-1000"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SchedulePreview } from "@/components/schedule-preview";
import { ArrowRight, Play, Sparkles } from "lucide-react";

export function HeroSection() {
    return (
        <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary/3 rounded-full blur-3xl" />
            </div>

            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
                    {/* Left: Content */}
                    <div className="text-center lg:text-left">
                        <Badge
                            variant="secondary"
                            className="mb-6 gap-1.5 py-1.5"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Nowa era planowania grafików
                        </Badge>

                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                            Koniec z chaosem{" "}
                            <span className="text-primary">
                                w grafikach pracy
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                            Intuicyjne narzędzie do tworzenia i zarządzania
                            grafikami dla zespołów 10-50 osób. Oszczędzaj
                            godziny każdego tygodnia dzięki inteligentnemu
                            planowaniu i automatyzacji.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                            <Button size="lg" className="gap-2 text-base">
                                Wypróbuj za darmo
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="gap-2 text-base"
                            >
                                <Play className="h-4 w-4" />
                                Zobacz demo
                            </Button>
                        </div>

                        {/* Trust indicators */}
                        <p className="text-sm text-muted-foreground">
                            ✓ 14 dni za darmo &nbsp;•&nbsp; ✓ Bez karty
                            kredytowej &nbsp;•&nbsp; ✓ Konfiguracja w 5 minut
                        </p>
                    </div>

                    {/* Right: Schedule Preview */}
                    <div className="relative">
                        <div className="absolute -inset-4 bg-linear-to-r from-primary/10 via-transparent to-primary/5 rounded-3xl blur-2xl -z-10" />
                        <SchedulePreview />
                    </div>
                </div>
            </div>
        </section>
    );
}

import { Button } from "@/components/ui/button";
import { STATS } from "@/lib/constants";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function CTASection() {
    return (
        <section className="py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 mb-16 sm:mb-20">
                    {STATS.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                                {stat.value}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {stat.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* CTA Box */}
                <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 sm:p-12 text-center">
                    {/* Background decoration */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.08),transparent_50%)]" />

                    <div className="relative">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                            Gotowy, by pożegnać się z chaosem?
                        </h2>
                        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                            Dołącz do setek zespołów, które już oszczędzają czas
                            i zwiększają efektywność dzięki inteligentnemu
                            planowaniu grafików.
                        </p>

                        {/* Benefits */}
                        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mb-8">
                            {[
                                "14 dni za darmo",
                                "Bez karty kredytowej",
                                "Wsparcie 24/7",
                            ].map((benefit) => (
                                <div
                                    key={benefit}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>{benefit}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button size="lg" className="gap-2 text-base">
                                Rozpocznij za darmo
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="text-base"
                            >
                                Umów demo
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

import { AISection } from "@/components/ai-section";
import { CTASection } from "@/components/cta-section";
import { FeaturesSection } from "@/components/features-section";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";

export default function Home() {
    return (
        <div className="min-h-screen bg-background font-sans antialiased">
            <Header />
            <main>
                <HeroSection />
                <section id="funkcje">
                    <FeaturesSection />
                </section>
                <section id="automatyzacja">
                    <AISection />
                </section>
                <CTASection />
            </main>
            <Footer />
        </div>
    );
}

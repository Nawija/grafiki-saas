import { Logo } from "@/components/logo";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
                <Logo size="md" />
            </header>

            {/* Main content */}
            <main className="flex-1 flex items-center justify-center p-4">
                {children}
            </main>

            {/* Background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 via-transparent to-transparent rounded-full" />
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/5 via-transparent to-transparent rounded-full" />
            </div>
        </div>
    );
}

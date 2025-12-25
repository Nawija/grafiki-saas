export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Grafiki
                    </h1>
                    <p className="text-slate-600 mt-2">
                        System harmonogramów pracy
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}

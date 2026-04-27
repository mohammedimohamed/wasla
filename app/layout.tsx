import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { settingsDb } from "@/lib/db";
import { LanguageProvider } from "@/src/context/LanguageContext";
import { SyncManager } from "@/src/components/SyncManager";
import { SwRegistrar } from "@/src/components/SwRegistrar";
import { SessionGuard } from "@/src/components/SessionGuard";

const inter = Inter({ subsets: ["latin"] });

// We want the app to always read fresh settings, so force dynamic render
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
    const settings = settingsDb.get();
    return {
        title: "Wasla CRM",
        description: `${settings.event_name} - Lead Capture Kiosk`,
        manifest: "/manifest.json",
        appleWebApp: {
            capable: true,
            statusBarStyle: "default",
            title: "WaslaCRM",
        },
        icons: {
            icon: [
                { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
                { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
            ],
            apple: "/icons/icon-192x192.png",
        },
        other: {
            "mobile-web-app-capable": "yes",
        },
    };
}

export const viewport: Viewport = {
    themeColor: "#ffffff",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const settings = settingsDb.get();

    // Inject the selected Primary Color dynamically!
    const themeStyles = {
        '--primary-color': settings.primary_color,
    } as React.CSSProperties;

    return (
        <html lang="fr" style={themeStyles}>
            <body className={inter.className}>
                <LanguageProvider>
                    <SwRegistrar />
                    <SyncManager />
                    <main className="min-h-screen bg-slate-50 flex flex-col relative pb-4">
                        <SessionGuard>
                            {children}
                        </SessionGuard>
                        <div className="fixed bottom-1.5 left-2.5 text-[10px] font-black tracking-widest text-slate-300 opacity-60 pointer-events-none z-50">
                            v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'}
                        </div>
                    </main>
                    <Toaster position="bottom-center" />
                </LanguageProvider>
            </body>
        </html>
    );
}



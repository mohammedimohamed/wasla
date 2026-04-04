import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { settingsDb } from "@/lib/db";
import { LanguageProvider } from "@/src/context/LanguageContext";
import { SyncManager } from "@/src/components/SyncManager";
import { RefreshGuard } from "@/src/components/RefreshGuard";
import { PWAManager } from "@/src/components/PWAManager";

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
            statusBarStyle: "black-translucent",
            title: "WaslaCRM",
            startupImage: "/icons/icon-512x512.png",
        },
        icons: {
            icon: [
                { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
                { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
            ],
            apple: [
                { url: "/icons/icon-192x192.png", sizes: "192x192" },
                { url: "/icons/icon-512x512.png", sizes: "512x512" },
            ],
        },
        other: {
            "mobile-web-app-capable": "yes",
            "apple-mobile-web-app-capable": "yes",
            "apple-mobile-web-app-status-bar-style": "black-translucent",
            "msapplication-tap-highlight": "no",
        },
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
    ],
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
                    <PWAManager />
                    <RefreshGuard />
                    <SyncManager />
                    <main className="min-h-screen bg-slate-50 flex flex-col">
                        {children}
                    </main>
                    <Toaster position="bottom-center" />
                </LanguageProvider>
            </body>
        </html>
    );
}



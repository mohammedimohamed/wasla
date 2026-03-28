import { isModuleEnabled } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * 🛰️ ADMIN SERVER GUARD
 * This server component intercepts admin routes to enforce 
 * modular plug-and-play logic at the layout level.
 */
export default async function AdminLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const headersList = headers();
    const pathname = headersList.get('x-pathname') || '';

    // 🧩 MODULE ROUTE MAPPING
    const moduleRoutes: Record<string, string> = {
        '/admin/rewards': 'rewards',
        '/admin/vault': 'vault',
        '/admin/settings/mediashow': 'mediashow',
        '/admin/intelligence': 'intelligence'
    };

    // 🛡️ RE-ENFORCE MODULARITY
    // If a module is disabled, the system will block navigation to its root group
    for (const [route, moduleId] of Object.entries(moduleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!isModuleEnabled(moduleId)) {
                console.warn(`[AdminLayout] Redirecting from disabled module: ${moduleId} (${pathname})`);
                redirect('/admin/dashboard');
            }
        }
    }

    return <>{children}</>;
}

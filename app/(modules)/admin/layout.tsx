import { isModuleEnabled } from '@/lib/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * 🛰️ MODULE ADMIN SERVER GUARD
 * This server component intercepts routes in the (modules) group to enforce 
 * modular plug-and-play logic.
 */
export default async function ModulesAdminLayout({
    children
}: {
    children: React.ReactNode;
}) {
    const headersList = await headers();
    const pathname = headersList.get('x-pathname') || '';

    // 🧩 MODULE ROUTE MAPPING
    const moduleRoutes: Record<string, string> = {
        '/admin/rewards': 'rewards',
        '/admin/vault': 'vault',
        '/admin/mediashow': 'mediashow',
        '/admin/intelligence': 'intelligence'
    };

    // 🛡️ RE-ENFORCE MODULARITY
    for (const [route, moduleId] of Object.entries(moduleRoutes)) {
        if (pathname.startsWith(route)) {
            if (!isModuleEnabled(moduleId)) {
                console.warn(`[ModulesAdminLayout] Redirecting from disabled module: ${moduleId} (${pathname})`);
                redirect('/admin/dashboard');
            }
        }
    }

    return <>{children}</>;
}

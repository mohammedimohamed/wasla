import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { dynamicConfig } from '@/src/config/dynamic';

const SECRET_STR = dynamicConfig.jwtSecret || 'wasla-fallback-secret-2026';
const SECRET = new TextEncoder().encode(SECRET_STR);

/**
 * 🔐 Session Payload Definition for Middleware Verification
 */
interface SessionPayload {
    userId: string;
    role: 'SALES_AGENT' | 'TEAM_LEADER' | 'ADMINISTRATOR';
    teamId?: string | null;
    hasPin?: boolean; // 🚨 CRITICAL: Prevents unauthorized bypassing of terminal lock
}

/**
 * 🛡️ Enterprise Middleware Gatekeeper
 * Enforces Role-Based Access Control (RBAC) and high-security session locks.
 */
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const sessionToken = request.cookies.get('wasla_session')?.value;

    const authRoutes = ['/admin', '/dashboard', '/api/sync', '/api/leads', '/api/profile', '/api/export', '/api/backup', '/leads'];
    const isProtected = authRoutes.some(route => pathname.startsWith(route));

    // Exclude Kiosk lead submission from auth middleware
    if (pathname === '/api/leads' && request.method === 'POST') {
        const source = request.headers.get('x-source');
        if (source === 'kiosk') return NextResponse.next();
    }

    // 🛡️ Pre-Auth Landing Logic (Handling / and /commercial)
    if (pathname === '/' || pathname === '/commercial') {
        if (sessionToken) {
            try {
                const { payload } = await jwtVerify(sessionToken, SECRET) as { payload: SessionPayload };
                // If logged in, go to appropriate dashboard (PIN gate will handle sub-auth)
                if (payload.role === 'ADMINISTRATOR') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
                return NextResponse.redirect(new URL('/dashboard', request.url));
            } catch (_) {}
        }
        // If not logged in and accessing /commercial, send to login
        if (pathname === '/commercial') return NextResponse.redirect(new URL('/login', request.url));
    }

    if (isProtected) {
        // 🏗️ Step 1: Complete bypass for Login/Setup portals and core auth API
        if (pathname === '/admin/login' || pathname === '/api/auth') {
            return NextResponse.next();
        }

        // 🏗️ Step 1b: Cron job bypass for /api/backup — API route handles key validation
        if (pathname === '/api/backup' && request.headers.get('X-Backup-Key')) {
            return NextResponse.next();
        }

        // 🏗️ Step 2: Handle Unauthenticated Requests
        if (!sessionToken) {
            console.log(`DEBUG: [Middleware] NO TOKEN for protected route: ${pathname}`);
            if (pathname.startsWith('/api')) {
                return NextResponse.json({ error: 'Auth Required' }, { status: 401 });
            }
            if (pathname.startsWith('/admin') || pathname.startsWith('/leads')) {
                return NextResponse.redirect(new URL('/admin/login', request.url));
            }
            if (pathname.startsWith('/commercial') || pathname.startsWith('/dashboard')) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
            return NextResponse.redirect(new URL('/', request.url));
        }

        try {
            // 🏗️ Step 3: Decrypt and Audit JWT
            console.log(`DEBUG: [Middleware] Parsing Raw Cookie Header: ${request.headers.get('cookie')?.substring(0, 50)}...`);

            const { payload } = await jwtVerify(sessionToken, SECRET) as { payload: SessionPayload };
            console.log(`DEBUG: [Middleware] Decrypted Payload:`, {
                userId: payload.userId,
                role: payload.role,
                hasPin: payload.hasPin
            });

            const { role, hasPin } = payload;

            // 🏗️ Step 4: PIN-Setup/Lock Gate
            // Protected portals require the 'hasPin' identity claim to be true
            const needsPinCheck =
                pathname.startsWith('/dashboard') ||
                pathname.startsWith('/admin/dashboard');

            if (needsPinCheck && !hasPin) {
                console.log(`DEBUG: [Middleware] REDIRECTING to PIN portal because: { hasToken: true, hasPin: false }`);
                if (pathname.startsWith('/admin')) {
                    return NextResponse.redirect(new URL('/admin/login', request.url));
                }
                // Sales agents/team leaders go to /login for PIN entry
                return NextResponse.redirect(new URL('/login', request.url));
            }

            // 🏗️ Step 5: Enterprise RBAC (Handle Admin with team_id: null)
            if (pathname.startsWith('/admin') && role !== 'ADMINISTRATOR') {
                console.log(`DEBUG: [Middleware] RBAC Violation: ${role} tried to access admin.`);
                return NextResponse.redirect(new URL('/', request.url));
            }

            if (pathname.startsWith('/dashboard/team') && role === 'SALES_AGENT') {
                console.log(`DEBUG: [Middleware] RBAC Violation: Agent tried to access team view.`);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }

            console.log(`DEBUG: [Middleware] ACCESS GRANTED to ${pathname}`);
            return NextResponse.next();
        } catch (error) {
            console.error(`DEBUG: [Middleware] JWT FAILURE:`, error instanceof Error ? error.message : error);
            const response = NextResponse.redirect(new URL('/', request.url));
            response.cookies.delete('wasla_session'); // Wipe corrupted token
            return response;
        }
    }

    return NextResponse.next();
}

/**
 * ⚙️ Routing Configuration for the Middleware
 */
export const config = {
    matcher: [
        '/',
        '/admin/:path*',
        '/dashboard/:path*',
        '/leads/:path*',
        '/api/:path*'
    ],
};

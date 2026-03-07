import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { dynamicConfig } from '@/src/config/dynamic';

const SECRET_STR = dynamicConfig.jwtSecret || 'wasla-fallback-secret-2026';
const SECRET = new TextEncoder().encode(SECRET_STR);

export type UserRole = 'SALES_AGENT' | 'TEAM_LEADER' | 'ADMINISTRATOR';

/**
 * 🔐 Session Payload Definition
 * Enterprise-grade session data including role, team ownership, 
 * and PIN setup completion status.
 */
export interface SessionPayload {
    userId: string;
    role: UserRole;
    teamId?: string | null;
    hasPin?: boolean; // 🚨 CRITICAL: Prevents unauthorized bypassing of terminal lock
}

/**
 * 🧱 Create or refresh the JWT session.
 * Managed as an HTTP-only secure cookie for XSS protection.
 */
export async function createSession(user: SessionPayload) {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    const token = await new SignJWT({ ...user })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1d')
        .sign(SECRET);

    cookies().set('wasla_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires,
        maxAge: 86400, // 🚨 NUCLEAR FIX: Explicit 24h duration for persistence
        path: '/',
        sameSite: 'lax'
    });
}

/**
 * 🔍 Retrieve and verify the active session.
 */
export async function getSession() {
    const sessionToken = cookies().get('wasla_session')?.value;
    if (!sessionToken) return null;

    try {
        const { payload } = await jwtVerify(sessionToken, SECRET);
        return payload as unknown as SessionPayload;
    } catch (error) {
        return null;
    }
}

/**
 * 🚪 Terminate the current session.
 */
export function deleteSession() {
    cookies().delete('wasla_session');
}

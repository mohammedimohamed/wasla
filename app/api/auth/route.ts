import { NextResponse } from 'next/server';
import { userDb, auditTrail } from '@/lib/db';
import { createSession, getSession } from '@/lib/auth';

/**
 * 🔍 SESSION CHECK (GET)
 * Returns the current authenticated user's state.
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ authenticated: false }, { status: 401 });

        const user = userDb.findById(session.userId);
        if (!user || !user.active) return NextResponse.json({ authenticated: false }, { status: 401 });

        return NextResponse.json({
            authenticated: true,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                isPinSet: !!user.quick_pin,
                needsPin: !user.quick_pin,             // true = first time, go to PIN_SETUP
                sessionHasPin: !!session.hasPin         // true = fully unlocked
            }
        });
    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}

/**
 * 🔐 INITIAL LOGIN (Email + Password)
 * This establishes the main enterprise session.
 */
export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        // 🛡️ Enterprise Auth Layer: Verification against Bcrypt Hashed Storage
        const user = userDb.verifyPassword(email, password);

        if (user) {
            // Establish an encrypted JWT session
            // 🚨 hasPin is FALSE initially if the user just used a password
            await createSession({
                userId: user.id,
                role: user.role,
                teamId: user.team_id,
                hasPin: false
            });

            // 📑 Audit Trail
            auditTrail.logAction(user.id, 'LOGIN', 'USER', user.id, `User ${user.email} performed initial login.`);

            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    needsPin: !user.quick_pin
                }
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        console.error('Auth API error:', error);
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

/**
 * 🔑 QUICK PIN (Setup or Verify)
 * Resumes an existing session OR settles a new one.
 */
export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Session Required' }, { status: 401 });

        const { pin, action } = await request.json();

        if (action === 'SETUP') {
            // 1. Persist hashed PIN to DB
            userDb.setQuickPin(session.userId, pin);

            // 🚨 2. CRITICAL: Refresh the JWT session with hasPin=true
            // This breaks the PIN setup loop by updating the client-side claim.
            await createSession({
                ...session,
                hasPin: true
            });

            return NextResponse.json({ success: true, message: 'PIN set successfully' });
        }

        if (action === 'VERIFY') {
            const isValid = userDb.verifyQuickPin(session.userId, pin);
            if (isValid) {
                // Refresh session with hasPin=true to "unlock" the terminal
                await createSession({
                    ...session,
                    hasPin: true
                });
                return NextResponse.json({ success: true, message: 'PIN Verified' });
            }
            return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Error' }, { status: 500 });
    }
}

/**
 * 🚪 LOGOUT
 * Terminates the JWT session.
 */
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('wasla_session');
    return response;
}

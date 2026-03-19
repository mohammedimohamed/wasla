export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
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
                tenantId: user.tenant_id,
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
        const { email, password, newPin } = await request.json();

        // 🛡️ Enterprise Auth Layer: Verification against Bcrypt Hashed Storage
        const user = userDb.verifyPassword(email, password);

        if (user) {
            // 🛡️ First-Run / Initial PIN Setup Logic
            // Allows defining the PIN during initial password login if none exists
            if (newPin) {
                if (user.quick_pin) {
                    return NextResponse.json({ success: false, error: 'PIN already configured' }, { status: 403 });
                }
                userDb.setQuickPin(user.id, newPin);
                // After setup, we establish a fully unlocked session (hasPin: true)
                await createSession({
                    userId: user.id,
                    role: user.role,
                    tenantId: user.tenant_id,
                    teamId: user.team_id,
                    hasPin: true
                });
            } else {
                // Regular password login (establishes locked session)
                await createSession({
                    userId: user.id,
                    role: user.role,
                    tenantId: user.tenant_id,
                    teamId: user.team_id,
                    hasPin: false
                });
            }

            // 📑 Audit Trail
            auditTrail.logAction(user.id, 'LOGIN', 'USER', user.id, newPin ? `User defined initial PIN and logged in.` : `User logged in via password.`);

            return NextResponse.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenant_id,
                    needsPin: !user.quick_pin && !newPin
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
        const { pin, action, userId: bodyUserId } = await request.json();
        const session = await getSession();

        // 🔓 Action Gate: Handle Session-less Resumption for 'VERIFY'
        // If we have a userId in the body, we can verify without a session (login flow)
        const targetUserId = session?.userId || bodyUserId;

        if (!targetUserId) {
            return NextResponse.json({ error: 'Session or User identity Required' }, { status: 401 });
        }

        if (action === 'SETUP') {
            if (!session) return NextResponse.json({ error: 'Session Required for SETUP' }, { status: 401 });
            userDb.setQuickPin(session.userId, pin);
            await createSession({ ...session, hasPin: true });
            const user = userDb.findById(session.userId);
            return NextResponse.json({ success: true, message: 'PIN set successfully', user });
        }

        if (action === 'VERIFY') {
            const isValid = userDb.verifyQuickPin(targetUserId, pin);
            if (isValid) {
                const user = userDb.findById(targetUserId);
                // Create a FRESH, fully authorized session
                await createSession({
                    userId: user.id,
                    role: user.role,
                    tenantId: user.tenant_id,
                    teamId: user.team_id,
                    hasPin: true
                });
                return NextResponse.json({ success: true, message: 'PIN Verified', user });
            }
            return NextResponse.json({ success: false, error: 'Invalid PIN' }, { status: 401 });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Auth API PUT error:', error);
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

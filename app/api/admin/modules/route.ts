import { NextResponse } from 'next/server';
import { moduleDb, auditTrail } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const modules = moduleDb.list();
        return NextResponse.json(modules);
    } catch (error) {
        console.error('[MODULES_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { id, is_enabled } = body;

        if (!id) {
            return new NextResponse('Module ID is required', { status: 400 });
        }

        moduleDb.updateStatus(id, !!is_enabled);

        auditTrail.logAction(
            session.userId,
            is_enabled ? 'ENABLE_MODULE' : 'DISABLE_MODULE',
            'MODULE',
            id,
            `Module ${id} ${is_enabled ? 'enabled' : 'disabled'}`
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[MODULES_PATCH]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

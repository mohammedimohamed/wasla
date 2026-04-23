import { NextResponse } from 'next/server';
import { dashboardDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const widgets = dashboardDb.getByUser(session.userId);
        return NextResponse.json({ widgets });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 401 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { type, title, config, position, col_span } = body;

        if (!type) {
            return NextResponse.json({ error: 'Missing type' }, { status: 400 });
        }

        const newWidget = {
            id: uuidv4(),
            user_id: session.userId,
            type,
            title: title || null,
            config: config || {},
            position: position || 0,
            col_span: col_span || 1
        };

        const id = dashboardDb.create(newWidget);
        return NextResponse.json({ message: 'Widget created', id, widget: newWidget });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        
        // Handle bulk reorder / replace (if body is array or has widgets property)
        if (body.action === 'bulk_replace' && Array.isArray(body.widgets)) {
            // Ensure all widgets belong to the current user
            const widgetsToSave = body.widgets.map((w: any) => ({
                ...w,
                user_id: session.userId,
                id: w.id || uuidv4()
            }));
            
            dashboardDb.bulkReplace(session.userId, widgetsToSave);
            return NextResponse.json({ message: 'Widgets bulk replaced successfully' });
        }

        // Handle single widget update
        const { id, title, config, position, col_span } = body;
        if (!id) {
            return NextResponse.json({ error: 'Missing widget id' }, { status: 400 });
        }

        dashboardDb.update(id, { title, config, position, col_span });
        return NextResponse.json({ message: 'Widget updated' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing widget id in query parameters' }, { status: 400 });
        }

        dashboardDb.delete(id);
        return NextResponse.json({ message: 'Widget deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

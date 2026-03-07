import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const result = db.prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pending'").get() as any;
        const count = result?.count || 0;
        return NextResponse.json({ count });
    } catch (error) {
        console.error('Failed to get sync status:', error);
        return NextResponse.json({ count: 0 }, { status: 500 });
    }
}

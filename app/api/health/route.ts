import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
    try {
        // Quick health check on the SQLite DB
        const result = db.prepare("SELECT 1 as ok").get() as { ok: number };
        if (result && result.ok === 1) {
            return NextResponse.json({ status: 'ok', database: 'connected', environment: process.env.NODE_ENV }, { status: 200 });
        }
        throw new Error("DB verification query failed");
    } catch (error: any) {
        return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });
    }
}

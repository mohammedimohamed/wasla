import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const guidePath = path.join(process.cwd(), 'app', 'admin', 'intelligence', 'guide.md');
        const content = fs.readFileSync(guidePath, 'utf8');
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }
}

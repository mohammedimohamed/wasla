import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('database') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'No database file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const dbPath = db.name;
        
        // Ensure we gracefully close the DB connection before overwriting
        db.close();
        
        // Overwrite the actual database file directly
        fs.writeFileSync(dbPath, buffer);
        
        // Wait 1 second to give the filesystem a moment and then kill the process
        // Docker/Render will immediately safely restart the container and initialize connection on start
        setTimeout(() => {
            process.exit(0);
        }, 1000);

        return NextResponse.json({ success: true, message: 'Database restored. Server is restarting.' }, { status: 200 });
    } catch (error: any) {
        console.error('[Restore API] Error:', error);
        return NextResponse.json({ error: 'Restore failed: ' + error.message }, { status: 500 });
    }
}

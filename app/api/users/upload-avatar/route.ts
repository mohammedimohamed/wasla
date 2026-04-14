import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { userDb } from '@/lib/db';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Auth required' }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        let targetUserId = formData.get('userId') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!targetUserId) {
            targetUserId = session.userId;
        }

        // Only admins can upload for someone else
        if (targetUserId !== session.userId && session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'agents');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const fileName = `${targetUserId}.jpg`;
        const filePath = path.join(uploadsDir, fileName);

        await sharp(buffer)
            .resize(150, 150, {
                fit: 'cover',
                position: 'attention' // Smart crop using entropy
            })
            .jpeg({ quality: 80 })
            .toFile(filePath);

        const photoUrl = `/uploads/agents/${fileName}?v=${Date.now()}`;

        // Update DB
        userDb.update(targetUserId, { photo_url: photoUrl }, session.userId);

        return NextResponse.json({ success: true, photoUrl });

    } catch (error: any) {
        console.error('[Upload Avatar API Error]', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

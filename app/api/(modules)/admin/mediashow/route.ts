export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { isModuleEnabled } from '@/lib/db';
import { mediashowDb } from '@/src/modules/mediashow/lib/mediashow-db';
import { getSession } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPublicUploadDir, deleteFile as deleteStorageFile } from '@/lib/storage';

/**
 * 📺 GET /api/admin/mediashow
 * List all assets
 */
export async function GET() {
    if (!isModuleEnabled('mediashow')) return new Response(null, { status: 403 });
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const assets = mediashowDb.list();
        return NextResponse.json({ success: true, assets });
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

/**
 * 📺 POST /api/admin/mediashow
 * Upload/Add new asset
 */
export async function POST(request: Request) {
    if (!isModuleEnabled('mediashow')) return new Response(null, { status: 403 });
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const duration = parseInt(formData.get('duration') as string || '10');

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists via storage utility
        const mediashowDir = getPublicUploadDir('mediashow');

        const ext = path.extname(file.name).toLowerCase();
        const fileName = `${uuidv4()}${ext}`;
        const filePath = path.join(mediashowDir, fileName);
        const fileUrl = `/uploads/mediashow/${fileName}`;

        fs.writeFileSync(filePath, buffer);

        const type = ['.mp4', '.webm', '.ogg'].includes(ext) ? 'video' : 'image';

        mediashowDb.add({
            type,
            url: fileUrl,
            duration: type === 'image' ? duration : 0
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('[Mediashow Upload Error]', e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

/**
 * 📺 PATCH /api/admin/mediashow
 * Bulk update order
 */
export async function PATCH(request: Request) {
    if (!isModuleEnabled('mediashow')) return new Response(null, { status: 403 });
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orders } = await request.json();
        mediashowDb.updateOrder(orders);

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

/**
 * 📺 DELETE /api/admin/mediashow
 * Remove asset
 */
export async function DELETE(request: Request) {
    if (!isModuleEnabled('mediashow')) return new Response(null, { status: 403 });
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const url = searchParams.get('url');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        // Delete from DB
        mediashowDb.delete(id);

        // Delete from Disk using storage utility
        if (url) {
            deleteStorageFile(url);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}

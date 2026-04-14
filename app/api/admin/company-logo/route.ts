import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMINISTRATOR') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload directory
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'company');
        
        // Ensure directory exists
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (err: any) {
            if (err.code !== 'EEXIST') throw err;
        }

        // Clean filename and handle extension
        const ext = file.name.split('.').pop() || 'png';
        const tenantId = (session as any).tenantId || 'default-tenant';
        
        // Save as : /uploads/company/tenant_logo_12345.png
        const safeFilename = `${tenantId}_logo_${Date.now()}.${ext}`;
        const filePath = join(uploadDir, safeFilename);

        await writeFile(filePath, buffer);

        const relativeUrlBase = `/uploads/company/${safeFilename}`;

        return NextResponse.json({ url: relativeUrlBase });
    } catch (error: any) {
        console.error('Logo upload error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

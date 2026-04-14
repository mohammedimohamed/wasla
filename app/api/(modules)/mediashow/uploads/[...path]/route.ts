import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPublicUploadDir } from '@/lib/storage';
import { Readable } from 'stream';

/**
 * 📺 EMERGENCY DYNAMIC MEDIA SERVER
 * Next.js standalone server does not serve files added to 'public' after build time.
 * This route interceptor catches all /uploads/... requests that the static server missed
 * and streams them directly from the volume/disk.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: filePathSegments } = await params;
        const baseUploadsDir = path.resolve(getPublicUploadDir());
        const fullPath = path.normalize(path.join(baseUploadsDir, ...filePathSegments));

        // 🛡️ Security Guard: Ensure we aren't leaking system files (no ../../ hacks)
        if (!fullPath.startsWith(baseUploadsDir)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(fullPath)) {
            console.warn(`[Media Proxy] 404 - ${fullPath}`);
            return new NextResponse('File Not Found', { status: 404 });
        }

        const stats = fs.statSync(fullPath);
        const range = request.headers.get('range');

        // 🧩 Guess Content-Type
        const ext = path.extname(fullPath).toLowerCase();
        const contentTypeMap: Record<string, string> = {
            '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
            '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
        };
        const contentType = contentTypeMap[ext] || 'application/octet-stream';

        // 📺 Support Range Headers for Video Scrubbing (Important for Mediashow)
        if (range && stats.isFile()) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            const chunksize = (end - start) + 1;
            
            const fileStream = fs.createReadStream(fullPath, { start, end });
            // @ts-ignore - ReadableStream is compatible
            const readable = new ReadableStream({
                start(controller) {
                    fileStream.on('data', (chunk) => controller.enqueue(chunk));
                    fileStream.on('end', () => controller.close());
                    fileStream.on('error', (err) => controller.error(err));
                },
                cancel() {
                    fileStream.destroy();
                }
            });

            return new NextResponse(readable, {
                status: 206, // Partial Content
                headers: {
                    'Content-Range': `bytes ${start}-${end}/${stats.size}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize.toString(),
                    'Content-Type': contentType,
                },
            });
        }

        // Full Stream for images and non-range requests
        const fileStream = fs.createReadStream(fullPath);
        // @ts-ignore
        const readable = new ReadableStream({
            start(controller) {
                fileStream.on('data', (chunk) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err) => controller.error(err));
            },
            cancel() {
                fileStream.destroy();
            }
        });

        return new NextResponse(readable, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('[Media Proxy Error]', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

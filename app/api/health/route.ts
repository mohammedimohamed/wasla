import { NextResponse } from 'next/server';

/**
 * 🩺 Health Check API for Render
 * This endpoint provides a fast response for the load balancer
 * to confirm the application container is running.
 */
export async function GET() {
    return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() });
}

import { NextResponse } from 'next/server';
import { badgeConfigDb } from '@/src/modules/badge-engine/db';

export async function GET() {
  try {
    const config = badgeConfigDb.get();
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    badgeConfigDb.save('00000000-0000-0000-0000-000000000000', body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

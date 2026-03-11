import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMINISTRATOR') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        // Fetch all leads and join with lineage to see if it's a merged child
        const rows = db.prepare(`
            SELECT l.*, u.name as created_by_name,
            (SELECT COUNT(*) FROM lead_lineage lin WHERE lin.child_id = l.id) as lineage_count
            FROM leads l 
            LEFT JOIN users u ON l.created_by = u.id 
            WHERE l.status != 'archived'
            ORDER BY l.created_at DESC
        `).all() as any[];
        
        const goldenLeads = rows.filter(row => {
            try {
                const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : {};
                const flatMeta = meta.metadata ? meta.metadata : meta;
                
                // Detection Rule 1: It has multiple phones or emails (Organic Golden Record)
                const multiCount = (Array.isArray(flatMeta.phone) ? flatMeta.phone.length : 0) + (Array.isArray(flatMeta.email) ? flatMeta.email.length : 0);
                const hasMultiIdentities = multiCount > 2 || (Array.isArray(flatMeta.associated_entities) && flatMeta.associated_entities.length > 0);
                
                // Detection Rule 2: It has lineage (Merged via Intelligence)
                const hasLineage = row.lineage_count > 0;
                
                // Detection Rule 3: Manual Promotion to Gold
                const isManuallyPromoted = flatMeta._is_golden === true;

                return hasMultiIdentities || hasLineage || isManuallyPromoted;
            } catch (e) {
                return false;
            }
        });

        // Flatten metadata for the frontend
        const parsedLeads = goldenLeads.map(lead => {
             const m = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : {};
             const flat = m.metadata ? m.metadata : m;
             return {
                 ...lead,
                 ...flat,
                 contact: flat.contact || flat.nom || flat.name || flat.prenom || '—',
                 societe: flat.societe || flat.entreprise || flat.company || ''
             };
        });

        return NextResponse.json({ success: true, leads: parsedLeads });
    } catch (e: any) {
        console.error('[Golden Records GET]', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await getSession();
    if (!session || (session.role !== 'ADMINISTRATOR' && session.role !== 'TEAM_LEADER')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { action, id } = body;

        if (action === 'PROMOTE') {
             const lead = db.prepare('SELECT metadata FROM leads WHERE id = ?').get(id) as any;
             if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });

             const meta = JSON.parse(lead.metadata || '{}');
             // Flatten if wrapped
             let updatedMeta = meta;
             if (meta.metadata && !Array.isArray(meta.metadata)) {
                 updatedMeta = { ...meta.metadata };
             }
             
             updatedMeta._is_golden = true;

             db.prepare('UPDATE leads SET metadata = ?, updated_at = ? WHERE id = ?')
               .run(JSON.stringify(updatedMeta), new Date().toISOString(), id);
               
             return NextResponse.json({ success: true, message: 'Promoted to Golden Record' });
        }
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e: any) {
        console.error('[Golden Records POST]', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

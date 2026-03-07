import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import { leadFormSchema, getAllFields } from '@/src/config/formSchema';

/**
 * 📥 SECURE EXPORT ENDPOINT
 * Supports two formats via ?format= query param:
 *   - (default / ?format=csv)  → UTF-8 CSV file download, schema-driven headers
 *   - ?format=json             → Flattened JSON (metadata merged into each lead object)
 *
 * RBAC: ADMINISTRATOR sees all leads; TEAM_LEADER sees their team only.
 */
export async function GET(request: Request) {
    try {
        // ── 1. SECURITY: Session & RBAC Gate ─────────────────────────────────
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (session.role !== 'ADMINISTRATOR' && session.role !== 'TEAM_LEADER') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // ── 2. FORMAT: Determine output format ───────────────────────────────
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'csv';

        // ── 3. DATA: Fetch Leads (RBAC-Scoped) ───────────────────────────────
        let rows: any[];
        if (session.role === 'ADMINISTRATOR') {
            rows = db.prepare(`
                SELECT l.*, u.name as created_by_name
                FROM leads l LEFT JOIN users u ON l.created_by = u.id
                ORDER BY l.created_at DESC
            `).all() as any[];
        } else {
            rows = db.prepare(`
                SELECT l.*, u.name as created_by_name
                FROM leads l LEFT JOIN users u ON l.created_by = u.id
                WHERE l.team_id = ?
                ORDER BY l.created_at DESC
            `).all(session.teamId) as any[];
        }

        // ── 4. SHARED: Flatten metadata into each row ────────────────────────
        const flattenedRows = rows.map(row => {
            let meta: Record<string, any> = {};
            try { meta = JSON.parse(row.metadata || '{}'); } catch (_) { /* noop */ }
            // Merge metadata fields into root object, exclude raw metadata string
            const { metadata: _raw, ...rootFields } = row;
            return { ...rootFields, ...meta };
        });

        // ── 5a. JSON FORMAT ───────────────────────────────────────────────────
        if (format === 'json') {
            return NextResponse.json({
                success: true,
                count: flattenedRows.length,
                exportedAt: new Date().toISOString(),
                leads: flattenedRows,
            });
        }

        // ── 5b. CSV FORMAT (default) ──────────────────────────────────────────
        const schemaFields = getAllFields(leadFormSchema);
        const arrayFieldNames = new Set(
            schemaFields
                .filter(f => f.type === 'multiselect' || f.type === 'chip-group')
                .map(f => f.name)
        );

        const systemCols = [
            { key: 'id', label: 'ID' },
            { key: 'source', label: 'Source' },
            { key: 'sync_status', label: 'Statut Sync' },
            { key: 'created_at', label: 'Date de Saisie' },
            { key: 'created_by_name', label: 'Auteur' },
        ];

        const schemaCols = schemaFields.map(f => ({
            key: f.name,
            label: f.label,
            isArray: arrayFieldNames.has(f.name),
        }));

        const esc = (val: any): string => {
            if (val === null || val === undefined) return '';
            const s = String(val).replace(/"/g, '""');
            return (s.includes(',') || s.includes('\n') || s.includes('"')) ? `"${s}"` : s;
        };

        const headers = [
            ...systemCols.map(c => esc(c.label)),
            ...schemaCols.map(c => esc(c.label)),
        ].join(',');

        const dataRows = flattenedRows.map(row => {
            const sysVals = systemCols.map(col =>
                col.key === 'created_at'
                    ? esc(new Date(row[col.key]).toLocaleString('fr-DZ'))
                    : esc(row[col.key])
            );
            const schVals = schemaCols.map(col => {
                const raw = row[col.key];
                return col.isArray && Array.isArray(raw) ? esc(raw.join(' | ')) : esc(raw);
            });
            return [...sysVals, ...schVals].join(',');
        });

        const csvContent = [headers, ...dataRows].join('\n');
        const bom = '\uFEFF'; // UTF-8 BOM for Excel (Arabic/French chars)
        const filename = `wasla_leads_${new Date().toISOString().split('T')[0]}.csv`;

        return new Response(bom + csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('[Export] Error:', error);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        db.prepare('DELETE FROM leads').run();
        db.prepare('DELETE FROM sync_log').run();
        db.prepare('VACUUM').run();

        return NextResponse.json({ success: true, message: 'Database reset' });
    } catch (error) {
        console.error('Reset error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

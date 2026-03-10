import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db, { formConfigDb } from '@/lib/db';

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

        // ── 4. Determine Output Format & Process Metadata ────────────────────
        /**
         * Resolve the flat metadata object from a lead row.
         * Handles both old broken leads (double-nested: {metadata:{...}}) and new flat leads.
         */
        const resolveMeta = (row: any): Record<string, any> => {
            try {
                const parsed = typeof row.metadata === 'string' ? JSON.parse(row.metadata || '{}') : (row.metadata || {});
                // If double-nested (old bug), unwrap it
                if (parsed.metadata && typeof parsed.metadata === 'object' && !Array.isArray(parsed.metadata)) {
                    return parsed.metadata;
                }
                return parsed;
            } catch (_) {
                return {};
            }
        };

        // Parse metadata for all rows and collect all unique metadata keys
        const allUsedMetaKeys = new Set<string>();
        const processedRows = rows.map(row => {
            const meta = resolveMeta(row);

            Object.keys(meta).forEach(key => {
                // Filter out technical keys that shouldn't be in business export
                const blacklist = ['metadata', 'consent_given', 'device_id'];
                if (!blacklist.includes(key)) {
                    allUsedMetaKeys.add(key);
                }
            });

            const { metadata: _raw, ...rootFields } = row;
            return { ...rootFields, _meta: meta };
        });

        // ── 5a. JSON FORMAT ───────────────────────────────────────────────────
        if (format === 'json') {
            const jsonOutput = processedRows.map(r => {
                const { _meta, ...root } = r;
                return { ...root, ..._meta };
            });
            return NextResponse.json({
                success: true,
                count: jsonOutput.length,
                exportedAt: new Date().toISOString(),
                leads: jsonOutput,
            });
        }

        // ── 5b. CSV FORMAT (Version-Agnostic Union) ──────────────────────────
        // 1. Fetch all form configs to build a universal dictionary of Field Keys -> Most Recent Labels
        const allConfigs = db.prepare('SELECT version, config FROM form_configs ORDER BY version DESC').all() as any[];

        // Build a mapping from fieldName -> { label, isArray }
        const fieldMetaMap = new Map<string, { label: string, isArray: boolean }>();

        // Process from oldest to newest so newer versions overwrite older labels
        const sortedConfigs = [...allConfigs].sort((a, b) => a.version - b.version);
        for (const record of sortedConfigs) {
            let schema;
            try {
                schema = typeof record.config === 'string' ? JSON.parse(record.config) : record.config;
                schema.pages?.forEach((p: any) => {
                    p.sections?.forEach((s: any) => {
                        const fields = s.groups ? s.groups.flatMap((g: any) => g.fields) : s.fields;
                        fields?.forEach((f: any) => {
                            if (f && f.name) {
                                fieldMetaMap.set(f.name, {
                                    label: f.label || f.name,
                                    isArray: f.type === 'multiselect' || f.type === 'chip-group'
                                });
                            }
                        });
                    });
                });
            } catch (e) { /* ignore parse error */ }
        }

        // 2. Define standard system columns
        const systemCols = [
            { key: 'id', label: 'ID' },
            { key: 'form_version', label: 'Version Form' },
            { key: 'source', label: 'Source' },
            { key: 'sync_status', label: 'Statut Sync' },
            { key: 'created_at', label: 'Date de Saisie' },
            { key: 'created_by_name', label: 'Auteur' },
        ];

        // 3. Prepare Schema Columns (The Union of all keys found in leads' metadata)
        // We order them by checking if they are in the dictionary first, then alphabetical
        const dynamicMetaKeys = Array.from(allUsedMetaKeys).sort((a, b) => {
            const hasA = fieldMetaMap.has(a);
            const hasB = fieldMetaMap.has(b);
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            return a.localeCompare(b);
        });

        const schemaCols = dynamicMetaKeys.map(key => {
            const metaInfo = fieldMetaMap.get(key);
            return {
                key,
                label: metaInfo ? metaInfo.label : key, // Fallback to key if no label found
                isArray: metaInfo ? metaInfo.isArray : false,
            };
        });

        // 4. Generate CSV
        const esc = (val: any): string => {
            if (val === null || val === undefined || val === '') return '—';

            // Handle Objects/Arrays to prevent [object Object]
            let s: string;
            if (Array.isArray(val)) {
                s = val.map(v => (v && typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' | ');
            } else if (typeof val === 'object') {
                s = JSON.stringify(val);
            } else {
                s = String(val);
            }

            const clean = s.replace(/"/g, '""');
            return (clean.includes(',') || clean.includes('\n') || clean.includes('"')) ? `"${clean}"` : clean;
        };

        const headers = [
            ...systemCols.map(c => esc(c.label)),
            ...schemaCols.map(c => esc(c.label)),
        ].join(',');

        const dataRows = processedRows.map(row => {
            const sysVals = systemCols.map(col => {
                if (col.key === 'form_version') {
                    return esc(row.form_version ? `v${row.form_version}` : 'v1');
                }
                if (col.key === 'created_at') {
                    return esc(new Date(row[col.key]).toLocaleString('fr-DZ'));
                }
                return esc(row[col.key]);
            });

            const schVals = schemaCols.map(col => {
                const raw = row._meta[col.key];
                return esc(raw);
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

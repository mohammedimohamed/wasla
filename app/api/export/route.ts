import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';

        const stmt = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');
        const leads = stmt.all() as any[];

        if (format === 'csv') {
            const headers = [
                'ID', 'Status', 'Source', 'Date', 'Societe', 'Contact', 'Telephone',
                'Email', 'Ville', 'Fonction', 'Type Client', 'Produits', 'Projet',
                'Quantite', 'Delai', 'Budget', 'Actions', 'Note', 'Commercial', 'Qualified By',
                'Consent Given', 'Consent At', 'Consent Source'
            ];

            const rows = leads.map(l => [
                l.id, l.sync_status, l.source, l.created_at, l.societe || '', l.contact, l.telephone || '',
                l.email || '', l.ville || '', l.fonction || '', l.type_client, l.produits, l.projet || '',
                l.quantite || '', l.delai || '', l.budget || '', l.actions || '', l.note || '', l.commercial || '', l.qualified_by || '',
                l.consent_given, l.consent_at || '', l.consent_source || ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            // Add UTF-8 BOM for Excel
            const BOM = '\uFEFF';

            return new Response(BOM + csvContent, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename=wasla_leads_${new Date().toISOString().split('T')[0]}.csv`,
                },
            });
        }

        return NextResponse.json({ success: true, leads });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
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

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        const wb = XLSX.utils.book_new();
        const data = [
            ["Nom Complet", "Email", "Rôle (ADMINISTRATOR, TEAM_LEADER, SALES_AGENT)", "ID Équipe (Optionnel)", "Mot de passe temporaire"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Users");

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="wasla_users_template.xlsx"'
            }
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to generate template" }, { status: 500 });
    }
}

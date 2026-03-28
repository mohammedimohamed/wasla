import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const mediashowDb = {
    list: () => {
        return db.prepare("SELECT * FROM mediashow_assets ORDER BY order_index ASC, created_at DESC").all() as any[];
    },

    add: (asset: { type: string, url: string, duration?: number }) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const lastOrder = db.prepare("SELECT MAX(order_index) as maxOrder FROM mediashow_assets").get() as { maxOrder: number | null };
        const nextOrder = (lastOrder?.maxOrder ?? -1) + 1;

        return db.prepare(`
            INSERT INTO mediashow_assets (id, type, url, order_index, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, asset.type, asset.url, nextOrder, asset.duration || 10, now);
    },

    updateOrder: (orders: { id: string, order_index: number }[]) => {
        const stmt = db.prepare("UPDATE mediashow_assets SET order_index = ? WHERE id = ?");
        const transaction = db.transaction((items: any) => {
            for (const item of items) {
                stmt.run(item.order_index, item.id);
            }
        });
        transaction(orders);
    },

    delete: (id: string) => {
        return db.prepare("DELETE FROM mediashow_assets WHERE id = ?").run(id);
    }
};

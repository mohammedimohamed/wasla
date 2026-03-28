import { getDb } from './db';

const moduleCache: Record<string, boolean> = {};

export const moduleDb = {
    list: () => {
        const db = getDb();
        return db.prepare("SELECT * FROM module_registry").all() as any[];
    },
    updateStatus: (id: string, isEnabled: boolean) => {
        const db = getDb();
        db.prepare("UPDATE module_registry SET is_enabled = ? WHERE id = ?").run(isEnabled ? 1 : 0, id);
        moduleCache[id] = isEnabled; // Update cache
    },
    isEnabled: (moduleId: string): boolean => {
        if (moduleCache[moduleId] !== undefined) return moduleCache[moduleId];
        
        try {
            const db = getDb();
            const row = db.prepare("SELECT is_enabled FROM module_registry WHERE id = ?").get(moduleId) as any;
            const enabled = row ? row.is_enabled === 1 : false;
            moduleCache[moduleId] = enabled;
            return enabled;
        } catch {
            return false;
        }
    }
};

export const isModuleEnabled = moduleDb.isEnabled;

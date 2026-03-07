import { v4 as uuidv4 } from 'uuid';

export interface OfflineLead {
    id: string; // Temporary unique ID for localStorage tracking
    type: 'kiosk' | 'commercial';
    payload: any;
    timestamp: number;
}

const STORAGE_KEY = 'wasla_offline_queue';

export function saveLeadOffline(payload: any, type: 'kiosk' | 'commercial'): OfflineLead {
    const leads = getOfflineLeads();

    const newLead: OfflineLead = {
        id: uuidv4(),
        type,
        payload,
        timestamp: Date.now()
    };

    leads.push(newLead);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
    console.log(`[Offline Engine] Saved 1 lead locally. Total queue: ${leads.length}`);
    return newLead;
}

export function getOfflineLeads(): OfflineLead[] {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

export function clearOfflineLeads(idsToRemove: string[]) {
    if (typeof window === 'undefined') return;
    try {
        const leads = getOfflineLeads();
        const remaining = leads.filter(l => !idsToRemove.includes(l.id));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        console.log(`[Offline Engine] Cleared ${idsToRemove.length} leads. Remaining queue: ${remaining.length}`);
    } catch (e) {

    }
}

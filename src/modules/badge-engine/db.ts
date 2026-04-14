import db from '@/lib/db';

export interface BadgeConfig {
  bgUrl?: string;
  textColor?: string;
  accentColor?: string;
  logoUrl?: string;
  qrSize?: number;
  layout?: 'standard' | 'compact' | 'modern';
}

export const badgeConfigDb = {
  get: (tenantId: string = '00000000-0000-0000-0000-000000000000'): BadgeConfig => {
    try {
      const row = db.prepare("SELECT config FROM badge_configs WHERE tenant_id = ?").get(tenantId) as any;
      if (row && row.config) {
        return JSON.parse(row.config);
      }
    } catch (e) {
      console.error('[badgeConfigDb.get] Error:', e);
    }
    return {
      bgUrl: '',
      textColor: '#ffffff',
      accentColor: '#4f46e5',
      logoUrl: '',
      qrSize: 180,
      layout: 'standard'
    };
  },
  
  save: (tenantId: string = '00000000-0000-0000-0000-000000000000', config: BadgeConfig) => {
    const now = new Date().toISOString();
    const configStr = JSON.stringify(config);
    try {
      db.prepare(`
        INSERT INTO badge_configs (id, tenant_id, config, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          config = excluded.config,
          updated_at = excluded.updated_at
      `).run(`badge_${tenantId}`, tenantId, configStr, now);
    } catch (e) {
      console.error('[badgeConfigDb.save] Error:', e);
      throw e;
    }
  }
};

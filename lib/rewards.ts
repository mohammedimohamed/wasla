import db from '@/lib/db';

export interface Reward {
    id: string;
    type_client: string;
    reward_type: 'catalogue_pdf' | 'promo_code' | 'guide_technique' | 'cadeau_physique';
    title: string;
    description: string;
    value: string;
    produit_filter: string | null;
    active: number;
}

export function matchReward(typeClient: string, produits: string[]): Reward | null {
    try {
        // Priority 1: exact type_client + product matching
        // We fetch all active rewards and filter in JS for simplicity of product matching
        const stmt = db.prepare('SELECT * FROM rewards WHERE active = 1');
        const allRewards = stmt.all() as any[];

        const rewardsWithParsedProducts = allRewards.map(r => ({
            ...r,
            produit_filter: r.produit_filter ? JSON.parse(r.produit_filter) : null
        }));

        // Find best match according to spec priority:

        // 1. type_client exact + produit_filter matching
        const p1 = rewardsWithParsedProducts.find(r =>
            r.type_client === typeClient &&
            r.produit_filter &&
            r.produit_filter.some((p: string) => produits.includes(p))
        );
        if (p1) return p1;

        // 2. type_client exact + produit_filter = NULL
        const p2 = rewardsWithParsedProducts.find(r =>
            r.type_client === typeClient &&
            !r.produit_filter
        );
        if (p2) return p2;

        // 3. type_client = 'ALL' + produit_filter matching
        const p3 = rewardsWithParsedProducts.find(r =>
            r.type_client === 'ALL' &&
            r.produit_filter &&
            r.produit_filter.some((p: string) => produits.includes(p))
        );
        if (p3) return p3;

        // 4. type_client = 'ALL' + produit_filter = NULL (fallback)
        const p4 = rewardsWithParsedProducts.find(r =>
            r.type_client === 'ALL' &&
            !r.produit_filter
        );
        if (p4) return p4;

        return null;
    } catch (error) {
        console.error('Error matching reward:', error);
        return null;
    }
}

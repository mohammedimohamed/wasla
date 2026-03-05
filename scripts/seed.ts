import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

function seed() {
    console.log('Seeding rewards...');

    const rewards = [
        {
            id: uuidv4(),
            type_client: 'ALL',
            reward_type: 'catalogue_pdf',
            title: 'Catalogue Général Wasla 2026',
            description: 'Découvrez l\'ensemble de nos produits phares pour cette année.',
            value: 'https://wasla.com/catalog.pdf',
            produit_filter: null,
            active: 1
        },
        {
            id: uuidv4(),
            type_client: 'Promoteur',
            reward_type: 'promo_code',
            title: 'Offre Spéciale Promoteurs',
            description: 'Bénéficiez de -15% sur votre première commande de baignoires groupée.',
            value: 'PROM2026',
            produit_filter: JSON.stringify(['baignoire', 'baignoire_tablier']),
            active: 1
        },
        {
            id: uuidv4(),
            type_client: 'Architecte',
            reward_type: 'guide_technique',
            title: 'Guide Technique Installation Jacuzzi',
            description: 'Spécifications techniques pour intégration en terrasse.',
            value: 'https://wasla.com/guides/jacuzzi-tech.pdf',
            produit_filter: JSON.stringify(['jacuzzi']),
            active: 1
        },
        {
            id: uuidv4(),
            type_client: 'Particulier',
            reward_type: 'promo_code',
            title: 'Bon de réduction Salon',
            description: 'Venez nous voir pour une remise immédiate.',
            value: 'WELCOME10',
            produit_filter: null,
            active: 1
        }
    ];

    const insert = db.prepare(`
    INSERT OR IGNORE INTO rewards (id, type_client, reward_type, title, description, value, produit_filter, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const now = new Date().toISOString();

    for (const r of rewards) {
        insert.run(r.id, r.type_client, r.reward_type, r.title, r.description, r.value, r.produit_filter, r.active, now, now);
    }

    console.log('Seeding complete.');
}

seed();

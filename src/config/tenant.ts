import { dynamicConfig } from './dynamic';

export interface TenantConfig {
    id: string;
    name: string;
    branding: {
        logo: string;
        primaryColor: string;
        secondaryColor: string;
        fontFamily: string;
    };
    auth: {
        commercialPin: string;
        adminPin: string;
    };
    event: {
        name: string;
        date: string;
        location: string;
    };
    rewards: {
        leadTypeToReward: Record<string, string>;
    };
    fields: LeadFormField[];
}

export type FieldType = 'text' | 'email' | 'tel' | 'select' | 'checkbox-group';

export interface LeadFormField {
    id: string;
    label: string;
    type: FieldType;
    placeholder?: string;
    options?: string[]; // For select or checkbox-group
    required?: boolean;
    validationRegex?: string;
}

export const tenantConfig: TenantConfig = {
    id: 'wasla-enterprise',
    name: dynamicConfig.tenantName,
    branding: {
        logo: '/logo.png',
        primaryColor: dynamicConfig.primaryColorBase,
        secondaryColor: dynamicConfig.secondaryColorBase,
        fontFamily: '"Inter", sans-serif',
    },
    auth: {
        commercialPin: dynamicConfig.commercialPin,
        adminPin: dynamicConfig.adminPin,
    },
    event: {
        name: dynamicConfig.eventName,
        date: dynamicConfig.eventDate,
        location: dynamicConfig.eventLocation,
    },
    rewards: {
        leadTypeToReward: {
            'Promoteur': 'Catalogue VIP',
            'Hôtel': 'Guide Technique',
            'Architecte': 'Catalogue Design',
            'Particulier': 'Remise 5%',
            'Revendeur': 'Catalogue Plomberie',
            'Plombier': 'Kit Outillage',
        },
    },
    fields: [
        { id: 'societe', label: 'Entreprise', type: 'text', placeholder: 'Nom de votre société' },
        { id: 'contact', label: 'Nom & Prénom', type: 'text', placeholder: 'Votre nom complet', required: true },
        { id: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '0XXX XX XX XX' },
        { id: 'email', label: 'Email', type: 'email', placeholder: 'contact@exemple.com' },
        {
            id: 'type_client',
            label: 'Type de Client',
            type: 'select',
            options: ['Promoteur', 'Hôtel', 'Architecte', 'Particulier', 'Revendeur', 'Plombier', 'Autre'],
            required: true
        },
        {
            id: 'produits',
            label: 'Produits d\'intérêt',
            type: 'checkbox-group',
            options: ['Baignoire', 'Jacuzzi', 'Sanitaires', 'Robinetterie', 'Chauffage'],
            required: true
        },
    ],
};

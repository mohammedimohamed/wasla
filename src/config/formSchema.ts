/**
 * 📄 WASLA FORM CONFIGURATION SCHEMA
 * =====================================
 * This is the SINGLE SOURCE OF TRUTH for the lead capture form.
 * To deploy Wasla for a new client/event, Tech Wise Advisors ONLY
 * needs to modify this file — no React component changes required.
 *
 * Field Types:
 * - 'text'          → Standard text input
 * - 'tel'           → Phone number input (triggers numeric keyboard on mobile)
 * - 'email'         → Email input with format validation
 * - 'textarea'      → Multi-line text area
 * - 'select'        → Single-choice chip selector
 * - 'multiselect'   → Multi-choice chip selector (stored as JSON array)
 * - 'chip-group'    → Compact multi-choice for actions/tags
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type FormFieldType =
    | 'text'
    | 'tel'
    | 'email'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'chip-group';

export interface FormFieldOption {
    value: string;       // The value stored in the DB
    label: string;       // The label shown in the UI
    icon?: string;       // Optional emoji/icon for visual chips
}

export interface FormField {
    /** Unique key — used as the JSON key in `metadata` column */
    name: string;
    /** Human-readable label shown in the UI */
    label: string;
    /** Determines the input widget to render */
    type: FormFieldType;
    /** Shown inside the input before the user types */
    placeholder?: string;
    /** Options for 'select', 'multiselect', 'chip-group' types */
    options?: FormFieldOption[];
    /** Triggers Zod required validation */
    required?: boolean;
    /** Shown next to label when required (e.g. "⭐") */
    requiredMark?: string;
    /** Minimum number of items for multiselect validation */
    minItems?: number;
    /** Lucide icon name string, e.g. 'Building', 'Phone' */
    icon?: string;
    /** Number of grid columns for this field (1 or 2, default 1) */
    colSpan?: 1 | 2;
    /** If true, this field appears as a column in the Admin Leads Table */
    showInTable?: boolean;
    /** Optional pixel width hint for the table column, e.g. 150 */
    tableWidth?: number;
}

export interface FormSection {
    /** Section title shown as a heading separator */
    title: string;
    /** Optional subtitle or instruction under the section title */
    description?: string;
    /** The fields that belong to this section */
    fields: FormField[];
}

export interface LeadFormSchema {
    /** Schema version — increment when making breaking changes */
    version: string;
    /** Human-readable name for this schema (for admin UI) */
    name: string;
    /** The ordered list of sections in the form */
    sections: FormSection[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BATIMATEC 2026 — FORM SCHEMA DEFINITION
// To white-label: replace this export with the new client's configuration.
// ─────────────────────────────────────────────────────────────────────────────

export const leadFormSchema: LeadFormSchema = {
    version: '1.0.0',
    name: 'Batimatec 2026 — Fiche Prospect',
    sections: [

        // ── SECTION 1: Contact Information ──────────────────────────────────────
        {
            title: 'Section 1 — Coordonnées',
            description: 'Informations de base du prospect.',
            fields: [
                {
                    name: 'societe',
                    label: 'Société / Entreprise',
                    type: 'text',
                    placeholder: 'Nom de la société',
                    icon: 'Building',
                    colSpan: 2,
                    showInTable: true,
                    tableWidth: 180,
                },
                {
                    name: 'contact',
                    label: 'Nom & Prénom du Contact',
                    type: 'text',
                    placeholder: 'Prénom et Nom',
                    icon: 'User',
                    required: true,
                    requiredMark: '⭐',
                    colSpan: 2,
                    showInTable: true,
                    tableWidth: 160,
                },
                {
                    name: 'telephone',
                    label: 'Téléphone',
                    type: 'tel',
                    placeholder: '0XXX XX XX XX',
                    icon: 'Phone',
                    colSpan: 1,
                    showInTable: true,
                    tableWidth: 130,
                },
                {
                    name: 'email',
                    label: 'Email',
                    type: 'email',
                    placeholder: 'contact@exemple.com',
                    icon: 'Mail',
                    colSpan: 1,
                },
                {
                    name: 'ville',
                    label: 'Ville / Wilaya',
                    type: 'text',
                    placeholder: 'Ex: Alger, Oran...',
                    icon: 'MapPin',
                    colSpan: 1,
                },
                {
                    name: 'fonction',
                    label: 'Fonction / Poste',
                    type: 'text',
                    placeholder: 'Ex: Directeur, Acheteur...',
                    icon: 'Briefcase',
                    colSpan: 1,
                },
            ],
        },

        // ── SECTION 2: Client Profile ────────────────────────────────────────────
        {
            title: 'Section 2 — Type de Client',
            description: 'Sélectionnez le profil le plus adapté.',
            fields: [
                {
                    name: 'type_client',
                    label: 'Type de Client',
                    type: 'select',
                    required: true,
                    requiredMark: '⭐',
                    options: [
                        { value: 'Promoteur', label: 'Promoteur' },
                        { value: 'Hôtel', label: 'Hôtel' },
                        { value: 'Architecte', label: 'Architecte' },
                        { value: 'Particulier', label: 'Particulier' },
                        { value: 'Revendeur', label: 'Revendeur' },
                        { value: 'Installateur/Plombier', label: 'Installateur / Plombier' },
                        { value: 'Autre', label: 'Autre' },
                    ],
                    colSpan: 2,
                    showInTable: true,
                    tableWidth: 150,
                },
            ],
        },

        // ── SECTION 3: Products of Interest ─────────────────────────────────────
        {
            title: "Section 3 — Produits d'intérêt",
            description: 'Peut sélectionner plusieurs produits.',
            fields: [
                {
                    name: 'produits',
                    label: "Produits d'intérêt",
                    type: 'multiselect',
                    required: true,
                    requiredMark: '⭐',
                    minItems: 1,
                    options: [
                        { value: 'baignoire', label: 'Baignoire', icon: '🛁' },
                        { value: 'baignoire_tablier', label: 'Baignoire avec tablier', icon: '🛁' },
                        { value: 'jacuzzi', label: 'Jacuzzi', icon: '💦' },
                        { value: 'sanitaires', label: 'Sanitaires', icon: '🚿' },
                        { value: 'robinetterie', label: 'Robinetterie', icon: '🔧' },
                        { value: 'chauffage', label: 'Chauffage', icon: '🔥' },
                    ],
                    colSpan: 2,
                    showInTable: true,
                    tableWidth: 200,
                },
            ],
        },

        // ── SECTION 4: Project Details ───────────────────────────────────────────
        {
            title: 'Section 4 — Détails Projet',
            description: 'Informations optionnelles sur le projet en cours.',
            fields: [
                {
                    name: 'projet',
                    label: 'Description du Projet',
                    type: 'textarea',
                    placeholder: 'Nature du projet, contexte...',
                    colSpan: 2,
                },
                {
                    name: 'quantite',
                    label: 'Quantité Estimée',
                    type: 'text',
                    placeholder: 'Ex: 50 unités',
                    colSpan: 1,
                },
                {
                    name: 'delai',
                    label: 'Délai de Réalisation',
                    type: 'text',
                    placeholder: 'Ex: Q3 2026',
                    colSpan: 1,
                },
                {
                    name: 'budget',
                    label: 'Budget Estimé',
                    type: 'text',
                    placeholder: 'Ex: 500 000 DA',
                    icon: 'Banknote',
                    colSpan: 2,
                },
            ],
        },

        // ── SECTION 5: Follow-Up Actions ─────────────────────────────────────────
        {
            title: 'Section 5 — Actions à Suivre',
            description: "Sélectionnez les actions à planifier après l'événement.",
            fields: [
                {
                    name: 'actions',
                    label: 'Actions',
                    type: 'chip-group',
                    options: [
                        { value: 'Envoyer devis', label: 'Envoyer devis' },
                        { value: 'Envoyer catalogue', label: 'Envoyer catalogue' },
                        { value: 'RDV', label: 'Planifier un RDV' },
                        { value: 'Rappel téléphonique', label: 'Rappel téléphonique' },
                        { value: 'Visite chantier', label: 'Visite chantier' },
                        { value: 'Démo produit', label: 'Démo produit' },
                    ],
                    colSpan: 2,
                },
            ],
        },

        // ── SECTION 6: Notes ─────────────────────────────────────────────────────
        {
            title: 'Section 6 — Notes Libres',
            fields: [
                {
                    name: 'note',
                    label: 'Remarques & Observations',
                    type: 'textarea',
                    placeholder: 'Informations supplémentaires, contexte important...',
                    colSpan: 2,
                },
            ],
        },

    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY: Flatten schema to a simple field list (for Zod, API, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/** Returns all fields from all sections as a flat array */
export function getAllFields(schema: LeadFormSchema): FormField[] {
    return schema.sections.flatMap(section => section.fields);
}

/** Returns the names of all required fields */
export function getRequiredFieldNames(schema: LeadFormSchema): string[] {
    return getAllFields(schema)
        .filter(f => f.required)
        .map(f => f.name);
}

/** Returns all array-type fields (multiselect, chip-group) for proper JSON handling */
export function getArrayFieldNames(schema: LeadFormSchema): string[] {
    return getAllFields(schema)
        .filter(f => f.type === 'multiselect' || f.type === 'chip-group')
        .map(f => f.name);
}

/** Returns fields marked showInTable: true, in order — drives the dynamic table & CSV headers */
export function getTableFields(schema: LeadFormSchema): FormField[] {
    return getAllFields(schema).filter(f => f.showInTable === true);
}

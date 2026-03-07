-- Migration 005: Dynamic Form Builder (Schema Engine)
-- Stores the entire lead capture form structure as a JSON blob.
-- One active row with id='active'. Old leads are safe because `metadata`
-- in the leads table is a flexible JSON column — existing data is never lost.

CREATE TABLE IF NOT EXISTS form_configs (
    id         TEXT PRIMARY KEY,      -- always 'active'
    version    INTEGER NOT NULL DEFAULT 1,
    config     TEXT NOT NULL,         -- JSON: { pages: [ { title, sections: [ { title, fields: [] } ] } ] }
    updated_at TEXT NOT NULL,
    updated_by TEXT                   -- userId of last admin to save
);

-- Seed with a Standard Form that mirrors the existing Batimatec 2026 schema.
-- Using INSERT OR IGNORE so re-running is safe.
INSERT OR IGNORE INTO form_configs (id, version, config, updated_at, updated_by)
VALUES (
    'active',
    1,
    json('{
      "version": 1,
      "name": "Batimatec 2026 — Fiche Prospect",
      "pages": [
        {
          "id": "page_1",
          "title": "Coordonnées & Profil",
          "sections": [
            {
              "id": "sec_contact",
              "title": "Coordonnées",
              "description": "Informations de base du prospect.",
              "fields": [
                {"name":"societe","label":"Société / Entreprise","type":"text","placeholder":"Nom de la société","required":false,"colSpan":2,"showInTable":true,"tableWidth":180},
                {"name":"contact","label":"Nom & Prénom du Contact","type":"text","placeholder":"Prénom et Nom","required":true,"colSpan":2,"showInTable":true,"tableWidth":160},
                {"name":"telephone","label":"Téléphone","type":"tel","placeholder":"0XXX XX XX XX","required":false,"colSpan":1,"showInTable":true,"tableWidth":130},
                {"name":"email","label":"Email","type":"email","placeholder":"contact@exemple.com","required":false,"colSpan":1,"showInTable":false},
                {"name":"ville","label":"Ville / Wilaya","type":"text","placeholder":"Ex: Alger, Oran...","required":false,"colSpan":1,"showInTable":false},
                {"name":"fonction","label":"Fonction / Poste","type":"text","placeholder":"Ex: Directeur, Acheteur...","required":false,"colSpan":1,"showInTable":false}
              ]
            },
            {
              "id": "sec_profil",
              "title": "Type de Client",
              "description": "Sélectionnez le profil le plus adapté.",
              "fields": [
                {"name":"type_client","label":"Type de Client","type":"select","required":true,"colSpan":2,"showInTable":true,"tableWidth":150,"options":[
                  {"value":"Promoteur","label":"Promoteur"},
                  {"value":"Hôtel","label":"Hôtel"},
                  {"value":"Architecte","label":"Architecte"},
                  {"value":"Particulier","label":"Particulier"},
                  {"value":"Revendeur","label":"Revendeur"},
                  {"value":"Installateur/Plombier","label":"Installateur / Plombier"},
                  {"value":"Autre","label":"Autre"}
                ]}
              ]
            }
          ]
        },
        {
          "id": "page_2",
          "title": "Produits & Projet",
          "sections": [
            {
              "id": "sec_produits",
              "title": "Produits d''intérêt",
              "description": "Peut sélectionner plusieurs produits.",
              "fields": [
                {"name":"produits","label":"Produits d''intérêt","type":"multiselect","required":true,"minItems":1,"colSpan":2,"showInTable":true,"tableWidth":200,"options":[
                  {"value":"baignoire","label":"Baignoire","icon":"🛁"},
                  {"value":"baignoire_tablier","label":"Baignoire avec tablier","icon":"🛁"},
                  {"value":"jacuzzi","label":"Jacuzzi","icon":"💦"},
                  {"value":"sanitaires","label":"Sanitaires","icon":"🚿"},
                  {"value":"robinetterie","label":"Robinetterie","icon":"🔧"},
                  {"value":"chauffage","label":"Chauffage","icon":"🔥"}
                ]}
              ]
            },
            {
              "id": "sec_projet",
              "title": "Détails Projet",
              "description": "Informations optionnelles sur le projet en cours.",
              "fields": [
                {"name":"projet","label":"Description du Projet","type":"textarea","placeholder":"Nature du projet, contexte...","required":false,"colSpan":2},
                {"name":"quantite","label":"Quantité Estimée","type":"text","placeholder":"Ex: 50 unités","required":false,"colSpan":1},
                {"name":"delai","label":"Délai de Réalisation","type":"text","placeholder":"Ex: Q3 2026","required":false,"colSpan":1},
                {"name":"budget","label":"Budget Estimé","type":"text","placeholder":"Ex: 500 000 DA","required":false,"colSpan":2}
              ]
            },
            {
              "id": "sec_actions",
              "title": "Actions à Suivre",
              "description": "Sélectionnez les actions à planifier après l''événement.",
              "fields": [
                {"name":"actions","label":"Actions","type":"chip-group","required":false,"colSpan":2,"options":[
                  {"value":"Envoyer devis","label":"Envoyer devis"},
                  {"value":"Envoyer catalogue","label":"Envoyer catalogue"},
                  {"value":"RDV","label":"Planifier un RDV"},
                  {"value":"Rappel téléphonique","label":"Rappel téléphonique"},
                  {"value":"Visite chantier","label":"Visite chantier"},
                  {"value":"Démo produit","label":"Démo produit"}
                ]},
                {"name":"note","label":"Remarques & Observations","type":"textarea","placeholder":"Informations supplémentaires, contexte important...","required":false,"colSpan":2}
              ]
            }
          ]
        }
      ]
    }'),
    datetime('now'),
    NULL
);

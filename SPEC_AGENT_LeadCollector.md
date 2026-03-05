# SPEC AGENT — Application Lead Collector <Client> Batimatec 2026
> Document de spécification complet destiné à un Agent AI pour le développement de bout en bout.

---

## 🎯 Contexte & Objectif

Développer une application web **mobile-first**, **offline-first PWA**, utilisée par l'équipe commerciale de **<Client>** lors des salons professionnels.

L'application a **deux missions** :
1. Permettre aux commerciaux de saisir manuellement les fiches prospects rencontrés sur le stand
2. Permettre aux prospects de s'auto-enregistrer eux-mêmes (via kiosque tablette ou QR code sur leur téléphone) en échange d'une récompense immédiate (catalogue, code promo, guide, bon cadeau)

---

## 🏗️ Stack Technique — Contraintes Absolues

| Couche | Technologie |
|---|---|
| Framework | **Next.js 14+ App Router — full SSR** |
| UI | **React 18 + TailwindCSS (mobile-first)** |
| Base de données locale | **SQLite** via `better-sqlite3` (Node.js runtime) |
| PWA / Offline | **next-pwa** + **Workbox** + **Service Worker** |
| Sync différée | **Background Sync API** (SyncEvent) |
| Validation | **Zod + react-hook-form** |
| Notifications UI | **react-hot-toast** |
| Icônes | **lucide-react** |
| Export | CSV + JSON (téléchargement direct) |
| Auth commerciale | PIN 4 chiffres partagé (variable d'env) |
| Auth manager | PIN 6 chiffres séparé (variable d'env) |

---

## 🗂️ Modèle de Données SQLite Complet

### Table `leads`

```sql
CREATE TABLE IF NOT EXISTS leads (
  id              TEXT PRIMARY KEY,           -- UUID v4 généré côté client
  sync_status     TEXT DEFAULT 'pending',     -- 'pending' | 'synced' | 'error'
  source          TEXT DEFAULT 'commercial',  -- 'commercial' | 'kiosk' | 'qrcode'
  created_at      TEXT NOT NULL,              -- ISO 8601 timestamp
  synced_at       TEXT,                       -- ISO 8601 timestamp, NULL si pas encore synced

  -- Informations contact
  societe         TEXT,
  contact         TEXT NOT NULL,              -- OBLIGATOIRE
  telephone       TEXT,
  email           TEXT,
  ville           TEXT,
  fonction        TEXT,

  -- Type de client (valeur unique)
  type_client     TEXT NOT NULL,
  -- ENUM: 'Promoteur' | 'Hôtel' | 'Architecte' | 'Particulier' | 'Revendeur' | 'Installateur/Plombier' | 'Autre'

  -- Produits d'intérêt (JSON array, min 1)
  produits        TEXT NOT NULL,
  -- JSON: ["Baignoire"] | ["Baignoire avec tablier"] | ["Jacuzzi"] | combinaisons

  -- Détails projet (optionnels)
  projet          TEXT,
  quantite        TEXT,
  delai           TEXT,
  budget          TEXT,

  -- Actions commerciales à suivre (JSON array, optionnel)
  actions         TEXT,
  -- JSON: ["Envoyer devis", "Envoyer catalogue", "RDV", "Rappel téléphonique"]

  -- Notes libres
  note            TEXT,

  -- Récompense attribuée (pour les leads auto-enregistrés)
  reward_id       TEXT,                       -- FK vers rewards.id
  reward_sent     INTEGER DEFAULT 0,          -- 0 | 1 (boolean)

  -- Métadonnées
  commercial      TEXT,                       -- Nom du commercial (NULL si kiosk/qrcode)
  qualified_by    TEXT,                       -- Nom du commercial qui a enrichi le lead (NULL si pas enrichi)
  device_id       TEXT                        -- Identifiant unique du device
);
```

### Table `rewards` (Gérée par le Manager)

```sql
CREATE TABLE IF NOT EXISTS rewards (
  id              TEXT PRIMARY KEY,           -- UUID v4
  type_client     TEXT NOT NULL,
  -- ENUM: 'Promoteur' | 'Hôtel' | 'Architecte' | 'Particulier' | 'Revendeur' | 'Installateur/Plombier' | 'Autre' | 'ALL'
  -- 'ALL' = s'applique à tous les types

  reward_type     TEXT NOT NULL,
  -- ENUM: 'catalogue_pdf' | 'promo_code' | 'guide_technique' | 'cadeau_physique'

  title           TEXT NOT NULL,              -- Ex: "Catalogue Produits <Client> 2026"
  description     TEXT,                       -- Description affichée au prospect
  value           TEXT,                       -- Ex: code promo "BATI2026", URL PDF, texte bon cadeau

  produit_filter  TEXT,
  -- NULL = s'applique à tous les produits
  -- JSON array: ["Jacuzzi"] = uniquement si le prospect a sélectionné Jacuzzi

  active          INTEGER DEFAULT 1,          -- 0 | 1
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
```

### Table `sync_log`

```sql
CREATE TABLE IF NOT EXISTS sync_log (
  id              TEXT PRIMARY KEY,
  synced_at       TEXT NOT NULL,
  leads_count     INTEGER NOT NULL,
  status          TEXT NOT NULL,              -- 'success' | 'partial' | 'error'
  error_message   TEXT
);
```

---

## 📁 Structure du Projet Next.js (App Router)

```
app/
├── layout.tsx                          → Root layout (PWA meta, manifest)
├── page.tsx                            → Redirect vers /login ou /dashboard

├── login/
│   └── page.tsx                        → Login commercial (PIN 4 chiffres)

├── dashboard/
│   └── page.tsx                        → Dashboard commercial

├── leads/
│   ├── new/page.tsx                    → Formulaire nouveau lead (commercial)
│   ├── list/page.tsx                   → Liste tous les leads
│   └── [id]/
│       ├── page.tsx                    → Détail lead
│       └── edit/page.tsx              → Édition lead

├── kiosk/
│   ├── page.tsx                        → Mode kiosque (formulaire auto-enregistrement)
│   └── success/page.tsx               → Page de remerciement + affichage récompense

├── admin/
│   ├── login/page.tsx                 → Login manager (PIN 6 chiffres)
│   ├── dashboard/page.tsx            → Dashboard manager
│   ├── rewards/
│   │   ├── page.tsx                   → Liste des récompenses configurées
│   │   ├── new/page.tsx              → Créer une récompense
│   │   └── [id]/edit/page.tsx        → Éditer une récompense
│   └── export/page.tsx               → Export CSV/JSON + stats

├── sync/
│   └── page.tsx                        → Statut sync + contrôles

└── api/
    ├── leads/
    │   ├── route.ts                   → GET (liste paginée), POST (créer)
    │   └── [id]/route.ts             → GET, PUT, DELETE
    ├── rewards/
    │   ├── route.ts                   → GET (liste), POST (créer)
    │   └── [id]/route.ts             → GET, PUT, DELETE
    ├── kiosk/
    │   └── submit/route.ts           → POST soumission formulaire kiosque/QR
    ├── sync/
    │   └── route.ts                   → POST batch sync vers serveur distant
    └── export/
        └── route.ts                   → GET export CSV ou JSON

public/
├── manifest.json                       → PWA manifest
├── sw.js                               → Service Worker (généré par next-pwa)
└── icons/                             → PWA icons (192x192, 512x512)

lib/
├── db.ts                               → Singleton connexion SQLite + migrations auto
├── auth.ts                             → Vérification PIN (commercial + manager)
└── rewards.ts                         → Logique de matching récompense/prospect

migrations/
└── 001_init.sql                        → Migration initiale (tables + index)
```

---

## 🛡️ Conformité Légale — Protection des Données Personnelles (Loi 18-07)

### Contexte Légal

L'application collecte des données à caractère personnel de prospects algériens. Elle est soumise à la **loi n° 18-07 du 25 Ramadan 1439 correspondant au 10 juin 2018** relative à la protection des personnes physiques dans le cadre du traitement des données à caractère personnel. En vertu de l'article 44 de cette loi, la circulation de ces données demeure **limitée au territoire national**.

---

### Texte Officiel du Consentement (à utiliser tel quel dans l'app)

> *<Client> est responsable du traitement des données à caractère personnel collectées via cette plateforme. Conformément aux dispositions de la loi n° 18-07 relative à la protection des personnes physiques dans le cadre du traitement des données à caractère personnel, promulguée le 25 Ramadan 1439 correspondant au 10 juin 2018, la circulation de ces données demeure limitée au territoire national (article 44 de la loi).*

---

### Champ `consent` dans la Table `leads`

Ajouter les colonnes suivantes à la table `leads` :

```sql
consent_given    INTEGER NOT NULL DEFAULT 0,  -- 1 = accepté, 0 = refus (ne doit jamais être 0 en base)
consent_at       TEXT,                          -- ISO 8601 timestamp du moment du consentement
consent_source   TEXT                           -- 'kiosk' | 'qrcode' (NULL si saisie commerciale)
```

> **Note** : Pour les leads saisis par un commercial (`source = 'commercial'`), le consentement est collecté verbalement sur le terrain. Le champ `consent_given` est mis à `1` automatiquement à la création, et `consent_source` est `NULL`.

---

### Déclenchement de la Modal de Consentement

La modal s'affiche **obligatoirement** dans deux contextes :

| Contexte | Moment d'affichage |
|---|---|
| **Mode Kiosque** | Après que le prospect appuie sur "Recevoir ma récompense →", avant tout enregistrement |
| **Page QR Code** (`/register`) | Idem — avant soumission finale |

Le formulaire **ne peut pas être soumis** tant que le prospect n'a pas coché la case et cliqué "Valider ✓".

---

### Comportement de la Modal

**Titre** : `Politique de protection des données à caractère personnel`

**Corps** : Texte légal tel que défini ci-dessus (voir section "Texte Officiel")

**Checkbox** : `J'ai lu et j'accepte la politique de protection des données à caractère personnel`
- Non cochée par défaut
- Le bouton "Valider ✓" reste **désactivé** (`disabled`, visuellement grisé) tant que la case n'est pas cochée

**Boutons** :
- `Annuler` → ferme la modal, le formulaire reste visible mais non soumis, aucune donnée enregistrée
- `Valider ✓` → activé uniquement si checkbox cochée → déclenche la soumission et l'enregistrement du lead avec `consent_given = 1` et `consent_at = now()`

**UX** :
- La modal est une overlay pleine largeur sur mobile (bottom sheet style)
- Elle ne peut pas être fermée en cliquant en dehors (forcer une décision explicite)
- Fond semi-transparent derrière la modal pour bloquer l'accès au formulaire
- Le bouton "Annuler" doit être clairement visible (l'utilisateur doit pouvoir refuser librement)

---

### Composant React — `ConsentModal`

Créer un composant réutilisable `components/ConsentModal.tsx` avec les props :

```typescript
interface ConsentModalProps {
  isOpen: boolean;
  onAccept: (timestamp: string) => void;  // appelé avec ISO timestamp
  onReject: () => void;
}
```

Ce composant est utilisé dans :
- `app/kiosk/page.tsx`
- `app/register/page.tsx`

---

### Export & Audit

Dans l'export CSV/JSON généré par le manager, inclure les colonnes `consent_given`, `consent_at`, `consent_source` afin de pouvoir prouver la conformité en cas de contrôle.

---

## 🔐 Système d'Authentification

### Deux niveaux d'accès distincts

| Rôle | PIN | Accès |
|---|---|---|
| **Commercial** | 4 chiffres (`SALES_PIN`) | Dashboard, leads, kiosque |
| **Manager** | 6 chiffres (`ADMIN_PIN`) | Tout + config récompenses + export |

- Les PINs sont stockés dans les variables d'environnement
- La session est stockée dans un cookie HTTP-only signé (durée : fin de journée)
- Sortir du mode kiosque requiert le PIN commercial
- Accéder à `/admin` requiert le PIN manager

---

## 📱 Description Détaillée de Chaque Écran

---

### 1. 🔐 Login Commercial (`/login`)

- Champ texte **"Votre prénom"** (stocké en session, identifie le commercial sur les leads)
- **Pavé numérique visuel** 4 chiffres (pas un input classique — UX dédiée, touches larges)
- Bouton "Accéder"
- Lien discret "Accès Manager" → `/admin/login`
- Design : Logo <Client> centré, fond sombre élégant, feedback vibration sur mobile

---

### 2. 🏠 Dashboard Commercial (`/dashboard`)

- **Header** : Logo <Client> + badge connectivité (🟢 En ligne / 🔴 Hors ligne) + prénom du commercial
- **Cards statistiques** :
  - Total leads du jour
  - Leads en attente de sync (badge rouge si > 0)
  - Leads synchronisés
- **Bouton CTA principal** : "+ Nouveau Lead" (pleine largeur, couleur primaire <Client>, très visible)
- **Bouton secondaire** : "Voir tous les leads"
- **Bouton** : "🔄 Synchroniser" (avec badge nombre en attente)
- **Bouton** : "📺 Activer le Mode Kiosque" (déclenche demande PIN de confirmation)

---

### 3. 📝 Formulaire Nouveau Lead — Mode Commercial (`/leads/new`)

Formulaire scrollable en **6 sections**, UX optimisée tactile.

**Header fixe** : "Nouvelle fiche prospect" + bouton retour

**Section 1 — Coordonnées**
- `Société` — input texte
- `Contact` ⭐ OBLIGATOIRE — input texte, validation non-vide
- `Téléphone` — input `tel`, clavier numérique natif
- `Email` — input `email`, validation format
- `Ville` — input texte
- `Fonction` — input texte (ex: "Directeur Technique", "Architecte")

**Section 2 — Type de Client** ⭐ OBLIGATOIRE
- Sélection exclusive (radio visuel) sous forme de **pills/chips larges** (min 48px hauteur) :
  - Promoteur | Hôtel | Architecte | Particulier | Revendeur | Installateur / Plombier | Autre
- État actif : fond couleur primaire <Client> + checkmark blanc

**Section 3 — Produits d'intérêt** ⭐ OBLIGATOIRE (min 1)
- Sélection multiple (checkboxes visuelles) sous forme de **cards avec icônes** :
  - 🛁 Baignoire
  - 🛁 Baignoire avec tablier
  - 💦 Jacuzzi
- État actif : fond coloré + checkmark visible

**Section 4 — Détails Projet**
- `Projet` — textarea (description libre du projet en cours)
- `Quantité estimée` — input texte (ex: "15 unités", "1 villa")
- `Délai` — input texte (ex: "Q3 2026", "dans 6 mois")
- `Budget` — input texte (ex: "500 000 DA", "non défini")

**Section 5 — Actions à Suivre**
- Sélection multiple (checkboxes visuelles) :
  - 📄 Envoyer devis | 📚 Envoyer catalogue | 📅 Planifier un RDV | 📞 Rappel téléphonique

**Section 6 — Notes**
- `Note` — grande textarea (remarques libres, observations du commercial)

**Footer fixe** :
- Bouton "💾 Enregistrer" (pleine largeur)
- Toast succès : "✅ Lead enregistré" (en ligne) ou "⏳ Sauvegardé localement" (hors ligne)
- Après soumission : reset formulaire + option "Nouveau lead" ou "Retour au dashboard"

---

### 4. 📋 Liste des Leads (`/leads/list`)

- **Barre de recherche** : filtre temps-réel sur nom, société, ville, téléphone
- **Filtres chips** :
  - Par type de client
  - Par statut sync : Tous / En attente / Synchronisés
  - Par source : Commercial / Kiosque / QR Code
- **Cards leads** (tap → détail/édition) :
  - Nom + Société
  - Type client (badge coloré)
  - Produits (tags)
  - Source (icône 👤 commercial / 📺 kiosque / 📱 QR code)
  - Date/heure de saisie
  - Statut sync : ⏳ / ✅ / ❌
- **FAB** : bouton "+" flottant en bas à droite → `/leads/new`

---

### 5. 👁️ Détail Lead (`/leads/[id]`)

- Affichage complet de toutes les informations
- Badge source visible (commercial / kiosque / QR code)
- Si source = kiosque ou QR code ET `qualified_by` est NULL → bandeau "⚠️ Lead non qualifié" + bouton "Qualifier ce lead" (ouvre le formulaire d'enrichissement)
- Historique de la récompense attribuée (si applicable)
- Boutons : Modifier | Supprimer (uniquement si `sync_status = 'synced'`)

---

## 📺 Module Auto-Enregistrement Prospect

---

### 6. MODE KIOSQUE (`/kiosk`)

> La tablette du stand est mise en mode kiosque. Le prospect remplit lui-même ses infos.

#### Activation du Mode Kiosque
1. Depuis le dashboard commercial, le commercial appuie sur "Activer Mode Kiosque"
2. Une modal demande confirmation PIN commercial
3. L'app navigue vers `/kiosk` et **verrouille la navigation** (aucun accès au reste de l'app, back button désactivé)

#### UX Kiosque
- **Écran d'accueil kiosque** : Message d'accroche (ex: "Recevez notre catalogue exclusif + un code promo ! Remplissez vos coordonnées."), bouton "Je participe →"
- **Timer d'inactivité** : si pas d'interaction pendant 90 secondes → reset automatique vers l'écran d'accueil
- **Design distinct** : fond différent du mode commercial pour que ce soit évident que c'est une interface publique

#### Formulaire Kiosque (Simplifié)

**Section 1 — Vos coordonnées**
- `Prénom & Nom` ⭐ OBLIGATOIRE
- `Téléphone` ⭐ OBLIGATOIRE (validation 10 chiffres minimum)
- `Email` ⭐ OBLIGATOIRE (validation format, car c'est le canal de livraison du catalogue/guide)
- `Ville`

**Section 2 — Votre profil**
- `Vous êtes...` ⭐ OBLIGATOIRE — même sélection type client (pills visuels larges)

**Section 3 — Vos intérêts**
- `Produit(s) qui vous intéressent` ⭐ OBLIGATOIRE (min 1) — même sélection produits

**Bouton "Recevoir ma récompense →"**

#### Logique de Matching Récompense

Après soumission du formulaire kiosque :
1. Requête vers `GET /api/rewards?type_client=X&produits=[Y,Z]`
2. L'API cherche dans la table `rewards` la récompense `active=1` correspondant au profil :
   - D'abord par `type_client` exact + `produit_filter` matching
   - Sinon par `type_client` exact + `produit_filter = NULL`
   - Sinon par `type_client = 'ALL'`
   - Sinon : récompense par défaut (catalogue général)
3. La récompense matchée est retournée et stockée dans le lead (`reward_id`)

#### Page de Remerciement (`/kiosk/success`)

Affichage selon le `reward_type` :

| reward_type | Affichage |
|---|---|
| `catalogue_pdf` | "✅ Merci ! Votre catalogue a été envoyé à votre email." + icône email |
| `promo_code` | "🎁 Votre code promo exclusif : **[CODE]**" (grand, lisible, encadré) + "Présentez ce code à nos commerciaux" |
| `guide_technique` | "📐 Votre guide technique a été envoyé à votre email." |
| `cadeau_physique` | "🎁 Présentez cet écran à notre équipe pour recevoir votre cadeau !" + bon visuel avec QR code de validation |

- Bouton "Terminer" → reset et retour écran d'accueil kiosque (après 15 secondes automatiquement)
- **PAS de bouton retour**, **PAS de lien vers l'app commerciale**

#### Sortie du Mode Kiosque
- Bouton discret en bas de l'écran d'accueil kiosque : "Accès équipe" → modal PIN commercial → retour dashboard

#### Sécurité Kiosque
- Déduplication : si même email ou téléphone soumet 2 fois en moins de 2 heures → message "Vous avez déjà participé ! Vérifiez votre email."
- Champ honeypot caché anti-bot
- Validation stricte : téléphone ≥ 9 chiffres, email format valide
- Navigation entièrement verrouillée (window.history intercepté, liens externes bloqués)

---

### 7. MODE QR CODE (`/register?event=batimatec2026`)

> Un QR code est affiché/imprimé sur le stand. Le prospect scanne avec son propre téléphone.

- Page **accessible publiquement** (pas de PIN, pas d'auth)
- Même formulaire simplifié que le mode kiosque (Section 1, 2, 3)
- Même logique de matching récompense
- Page de succès adaptée au mobile (le prospect est sur son propre téléphone)
- Le lead créé est tagué `source = 'qrcode'`
- En cas de offline (réseau salon faible) : la page doit gérer l'erreur réseau gracieusement avec un message "Connexion instable, réessayez dans quelques secondes"

**Note technique** : Cette page est la seule qui nécessite une connexion internet active (le téléphone du prospect utilise son propre réseau). Elle doit être déployée sur le serveur distant accessible publiquement.

---

## ⚙️ Administration — Espace Manager

---

### 8. Login Manager (`/admin/login`)

- PIN **6 chiffres** (séparé du PIN commercial)
- Accès à l'espace de configuration complet

---

### 9. Dashboard Manager (`/admin/dashboard`)

- Stats globales : total leads, par source, par type client, par produit
- Tableau de bord récompenses : nb de chaque type distribué
- Dernières syncs
- Liens vers : Gérer les récompenses | Exporter les données | Vue liste complète

---

### 10. Gestion des Récompenses (`/admin/rewards`)

#### Liste des récompenses configurées
- Tableau : Type client cible | Type récompense | Titre | Statut (actif/inactif) | Actions

#### Créer / Éditer une récompense (`/admin/rewards/new`, `/admin/rewards/[id]/edit`)

Formulaire :

- `Type de client cible` ⭐ — dropdown avec options : Tous | Promoteur | Hôtel | Architecte | Particulier | Revendeur | Installateur/Plombier | Autre
- `Filtre produit` — optionnel, multi-sélect : Tous | Baignoire | Baignoire avec tablier | Jacuzzi
- `Type de récompense` ⭐ — radio :
  - 📘 Catalogue PDF (envoyé par email)
  - 🏷️ Code promo exclusif (affiché à l'écran)
  - 📐 Guide technique par produit (envoyé par email)
  - 🎁 Cadeau physique (bon à présenter)
- `Titre` ⭐ — ex: "Catalogue <Client> Baignoires & Jacuzzi 2026"
- `Description` — texte affiché au prospect (ex: "Notre sélection complète de baignoires haut de gamme")
- `Valeur` — selon le type :
  - Pour code promo : le code (ex: "BATI2026-PROMO")
  - Pour PDF : URL du fichier (lien Google Drive, CDN, etc.)
  - Pour cadeau physique : texte du bon (ex: "1 kit de robinetterie offert - Valable le 25-27 mars 2026")
- `Actif` — toggle

**Règle de priorité de matching** (implémentée dans `lib/rewards.ts`) :
1. `type_client` exact + `produit_filter` matching (plus spécifique)
2. `type_client` exact + `produit_filter = NULL`
3. `type_client = 'ALL'` + `produit_filter` matching
4. `type_client = 'ALL'` + `produit_filter = NULL` (fallback général)

---

### 11. Export (`/admin/export`)

- Filtres : par date, par source, par type client, par statut sync
- Bouton **"Exporter CSV"** → téléchargement direct (toutes les colonnes, encodage UTF-8 avec BOM pour Excel)
- Bouton **"Exporter JSON"** → téléchargement direct
- Bouton **"Reset base de données"** (avec double confirmation) → purge tous les leads (usage : repartir à zéro pour un nouvel événement)

---

## 🔄 Architecture Offline-First & Sync Différée

### Stratégie de stockage
- SQLite est la **source de vérité locale** (côté serveur Next.js / Node.js)
- Toutes les opérations passent par les routes API `/api/*` qui lisent/écrivent en SQLite
- Chaque lead a un `sync_status` qui trace son état

### Service Worker (Workbox via next-pwa)
```
Cache strategies :
- Shell app (HTML, JS, CSS, fonts) → CacheFirst (TTL: infini)
- Appels GET /api/leads → NetworkFirst (fallback cache)
- Appels POST /api/leads → NetworkFirst + Background Sync si offline
- Assets statiques (images, icons) → CacheFirst
```

### Flow Background Sync complet
```
1. Commercial saisit un lead → POST /api/leads
2. Si ONLINE  → SQLite sauvegardé → sync_status = 'synced' ✅
3. Si OFFLINE → Service Worker intercepte la requête
              → Stocke dans IndexedDB (queue de sync)
              → SQLite sauvegardé localement → sync_status = 'pending'
              → Enregistre SyncEvent: 'sync-leads-queue'
4. Quand le réseau revient → SW déclenche SyncEvent
5. SW récupère les leads 'pending' depuis SQLite
6. Batch POST vers /api/sync (serveur distant)
7. Pour chaque lead confirmé → update sync_status = 'synced'
8. En cas d'erreur partielle → sync_status = 'error' + retry automatique
```

### Endpoint sync distant
- `POST /api/sync` accepte un array de leads JSON
- Retourne `{ confirmed: [id1, id2, ...], errors: [...] }`
- Peut pointer vers un serveur Next.js déployé sur VPS, Vercel, Railway, etc.
- L'URL est configurable via variable d'env `SYNC_ENDPOINT`

---

## 🎨 Design System — Mobile First

### Principes Fondamentaux
- **Mobile first** : toute l'UI est designée pour 375px en premier
- **Touch-friendly** : zones de tap minimum 48×48px
- **Thumb zone** : boutons primaires et FAB dans la moitié basse de l'écran
- **Feedback immédiat** : chaque action a un retour visuel ou haptique

### Palette Couleurs
- Primaire <Client> : bleu professionnel (à définir selon charte — fallback `#1E40AF`)
- Succès : vert `#16A34A`
- Alerte / Pending : orange `#D97706`
- Erreur : rouge `#DC2626`
- Fond : blanc `#FFFFFF` + gris clair `#F9FAFB`
- Texte : gris foncé `#111827`

### Composants UI Clés
- **Pills de sélection** : état inactif = bordure grise, état actif = fond bleu primaire + texte blanc + checkmark
- **Cards produits** : icône + label + état actif bien visible
- **Toasts** : positionnés en bas de l'écran (zone pouce), durée 3s
- **FAB** : bouton "+" fixe en bas à droite, shadow prononcée
- **Indicateur connectivité** : pastille colorée dans le header, persistante
- **Skeleton loaders** : pour les listes en chargement

### Breakpoints
- Mobile : < 640px (design principal)
- Tablette : 640–1024px (grille 2 colonnes sur les cards)
- Desktop : > 1024px (max-width 768px centré)

---

## 🔧 Variables d'Environnement

```env
# Auth
SALES_PIN=1234                         # PIN commercial (4 chiffres)
ADMIN_PIN=123456                       # PIN manager (6 chiffres)
SESSION_SECRET=<random_256bit_string>  # Secret de signature des cookies

# Base de données
SQLITE_DB_PATH=./data/batimatec2026.db

# Synchronisation
SYNC_ENDPOINT=https://votre-serveur.com/api/sync
NEXT_PUBLIC_SYNC_ENABLED=true

# App
NEXT_PUBLIC_EVENT_NAME=Batimatec 2026
NEXT_PUBLIC_COMPANY_NAME=<Client>
NEXT_PUBLIC_APP_PIN=1234               # Exposé côté client pour la validation kiosque
NEXT_PUBLIC_QR_BASE_URL=https://votre-domaine.com  # URL de base pour le QR code
```

---

## 📦 Packages NPM

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "better-sqlite3": "^9.6.0",
    "next-pwa": "^5.6.0",
    "uuid": "^10.0.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.6.0",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.400.0",
    "tailwindcss": "^3.4.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/uuid": "^10.0.0",
    "typescript": "^5.5.0"
  }
}
```

---

## ✅ Règles Métier & Validations

### Formulaire Commercial
1. `contact` : obligatoire, non vide, min 2 caractères
2. `type_client` : obligatoire, exactement 1 valeur parmi la liste définie
3. `produits` : obligatoire, au moins 1 produit sélectionné
4. `email` : optionnel mais si rempli → format valide
5. `telephone` : optionnel mais si rempli → min 9 caractères numériques

### Formulaire Kiosque / QR Code
1. `contact` : obligatoire
2. `telephone` : obligatoire, min 9 chiffres
3. `email` : obligatoire (nécessaire pour envoyer catalogue/guide)
4. `type_client` : obligatoire
5. `produits` : obligatoire, min 1
6. **Anti-doublon** : même email OU même téléphone = refus si soumission < 2h précédente

### Gestion des Leads
7. Un lead supprimable **uniquement** si `sync_status = 'synced'`
8. Un lead kiosque/QR peut être **enrichi** par un commercial (ajout infos projet, actions) → `qualified_by` est renseigné
9. Chaque lead = UUID v4 généré côté client à la création (garantit unicité même en offline multi-devices)
10. `device_id` = généré au premier lancement, stocké en localStorage, attaché à chaque lead

### Récompenses
11. Une seule récompense est attribuée par lead (la première qui matche selon l'ordre de priorité)
12. `reward_sent` passe à `1` uniquement après confirmation de livraison (email envoyé ou code affiché)
13. Si aucune récompense ne matche → afficher un message par défaut sans crash

---

## 🛡️ Sécurité

- Toutes les routes `/api/*` (sauf `/api/kiosk/submit` et `/register`) vérifient le cookie de session
- Route `/admin/*` et `/api/rewards/*` vérifient le niveau "manager"
- Le formulaire kiosque est **entièrement isolé** de l'interface commerciale (routes séparées, aucun lien croisé)
- Validation Zod **côté serveur** sur toutes les routes API (jamais faire confiance au client seul)
- Sanitisation des inputs (protection XSS via Next.js par défaut + pas de `dangerouslySetInnerHTML`)
- Rate limiting sur `/api/kiosk/submit` : max 10 soumissions / minute / IP

---

## 🚀 Livrables Attendus

1. **Repo Next.js complet** et fonctionnel, prêt à démarrer avec `npm install && npm run dev`
2. **Migration SQLite auto-exécutée** au démarrage (`lib/db.ts` → `migrations/001_init.sql`)
3. **Service Worker** configuré, testé, avec manifest PWA complet
4. **Tous les écrans** décrits ci-dessus, responsive mobile-first
5. **Données de seed** pour les récompenses (un exemple de chaque type, par type de client)
6. **`README.md`** complet avec :
   - Instructions installation (dev + prod)
   - Guide de configuration des variables d'env
   - Procédure de déploiement (recommendation : Railway ou VPS Ubuntu)
   - Comment générer et imprimer le QR code
   - Script de reset base de données
7. **Script utilitaire** `scripts/reset-db.ts` : purge les leads, remet les compteurs à zéro (usage : nouveau jour de salon ou nouvel événement)

---

## 📋 Ordre de Développement Recommandé à l'Agent

1. Setup Next.js 14 + TailwindCSS + TypeScript
2. Configuration SQLite + migrations + `lib/db.ts`
3. Routes API CRUD leads (`/api/leads`)
4. Formulaire commercial + login commercial
5. Dashboard + liste leads
6. Configuration PWA (next-pwa + manifest + Service Worker + Background Sync)
7. Module récompenses : table + routes API `/api/rewards`
8. Interface admin : login manager + CRUD récompenses
9. Mode kiosque : formulaire + logique matching + page succès
10. Page QR Code `/register`
11. Sync différée (Background Sync complet)
12. Export CSV/JSON
13. Tests offline (Chrome DevTools → Network → Offline)
14. README + seed data + script reset

---

*Spec rédigée pour <Client> — Batimatec 2026 — Version 2.1 — Inclut module Auto-Enregistrement Prospect avec Récompenses Configurables par Profil + Conformité Loi 18-07 Protection des Données Personnelles*

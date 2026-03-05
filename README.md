# Wasla Lead Collector — Batimatec 2026

Application web **mobile-first**, **offline-first PWA** conçue pour la collecte de leads sur stand lors des salons professionnels.

## 🚀 Installation Rapide

1. **Cloner le projet**
2. **Installer les dépendances**
   ```bash
   npm install
   ```
   *Note: Si l'installation de `better-sqlite3` échoue sur Windows, assurez-vous d'avoir les outils de build C++ ou essayez `npm install better-sqlite3@latest`.*

3. **Configurer les variables d'env**
   Créez un fichier `.env` à la racine (voir modèle ci-dessous).

4. **Peupler les récompenses (Initialisation)**
   Pour que le mode Kiosque fonctionne, vous devez insérer les offres initiales :
   ```bash
   npm run seed
   ```

5. **Démarrer en mode développement**
   ```bash
   npm run dev
   ```

## ⚙️ Configuration (.env)

| Variable | Description | Exemple |
|---|---|---|
| `SALES_PIN` | Code d'accès commercial (4 chiffres) | `1234` |
| `ADMIN_PIN` | Code d'accès manager (6 chiffres) | `123456` |
| `SESSION_SECRET` | Secret pour signature cookies | `votre_secret_aleatoire` |
| `SQLITE_DB_PATH` | Chemin vers la DB SQLite | `./data/batimatec2026.db` |
| `SYNC_ENDPOINT` | URL du serveur de synchro distant | `https://api.wasla.dz/sync` |
| `NEXT_PUBLIC_APP_PIN` | PIN client pour validation kiosque | `1234` |

## 🛠️ Scripts Utilitaires

- **Seed des récompenses** : `npm run seed` (nécessite `tsx scripts/seed.ts` configuré dans package.json)
- **Reset des leads** : `npm run reset-db` (purge les fiches prospects)
- **Mode Production** : `npm run build && npm start`

## 📱 Utilisation

### Mode Commercial
- Accessible via `/login`.
- Permet la saisie rapide des fiches complexes et la consultation de la liste.

### Mode Kiosque
- Activé depuis le dashboard commercial.
- Verrouille l'interface pour le public.
- Reset automatique après 90s d'inactivité.

### Mode Manager (Admin)
- Accessible via `/admin/login`.
- Permet l'export CSV/JSON et la configuration des récompenses par profil client.

## ⚖️ Conformité Légale (Loi 18-07)
L'application intègre une modal de consentement obligatoire conforme à la législation algérienne sur la protection des données personnelles. Les données sont stockées au niveau local et leur circulation est restreinte conformément à l'article 44 de la loi.

---
*Développé pour Wasla — Batimatec 2026*

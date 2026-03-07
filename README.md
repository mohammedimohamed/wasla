# Wasla CRM 🚀
*The ultimate offline-first, white-label Lead Management Engine designed natively for high-velocity Exhibition Environments.*

![Wasla Kiosk UI](./docs/kiosk_preview.png) *(Preview placeholder)*

## 🏗️ Architecture & Stack
- **Framework**: Next.js 14 App Router (Server-Side Focused).
- **Database**: `better-sqlite3` strictly utilizing persistent local-volume binding. Zero external Cloud SaaS points of failure.
- **Styling**: Tailwind CSS configured with a fully responsive Dark/Light Admin Extranet dynamically pushing `.env` parameter brands onto Kiosk elements.
- **Validation**: Strict `Zod` API typing mapping natively to React-Hook-Forms mitigating all injection structures.

---

## 🔑 Installation & Deployment Process

### 1. Basic Setup
Ensure `Node.js 18+` is active natively.
```bash
git clone https://github.com/organization/wasla.git
cd wasla
npm install
```

### 2. Configure Environment
Create `.env` mirroring the `.env.example`.
```env
# Absolute Route binding to your Docker Volume securely:
DB_PATH=./database/wasla.sqlite
JWT_SECRET="YOUR_SUPER_SECURE_RANDOM_HASH_HERE"
```

### 3. Initialize & Seed SQLite
The Migration system enforces schema synchronicity dynamically generating Users & Standardized Theming out-of-the-box.
```bash
npm run seed
```
**Default Administrator:** 
`admin@wasla.dev` / `adminpassword`

---

## 💻 Operating The Platform

### Development
Exposes the CRM to your local network (`0.0.0.0`) permitting iPad / iPhone testing:
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 🔥 Key Commands & Scripts

- `npm run seed`: Wipes the entire database back to zero and rebuilds the `users`, `teams`, and `tenant_settings` with the default state.
- `npm run db:reset`: **CRITICAL TRADE-SHOW COMMAND.** Leaves your Sales Agents and Settings completely untouched, but irreversibly wipes ALL `leads` and resets Active Reward `claimed_count` capacities back to 0. Use strictly when launching a new event.

---

## 🔒 Security Posture & RBAC Layers
The entire platform isolates visibility natively depending on the session cookie signature matching:
1. **Administrators**: God-Mode. Manipulate underlying schema brands, deploy QR Tracking codes, and wipe constraints natively.
2. **Team Leaders**: See aggregated lead capture arrays mapped linearly down to their specific reporting sub-agents.
3. **Sales Agents**: Isolates inputs mapping strictly to `<Self>` preventing aggressive poaching.

---

## 🌐 Offline-First Resilience (PWA Mode)
Wasla runs securely disconnected. If standard 4G/5G connections drop completely inside a Trade Show Hall:
1. **PWA Install**: iPads can natively "Add to Homescreen", permanently locking assets out of Safari memory ceilings.
2. **Offline Queues**: If `fetch()` connections crash natively resolving timeouts or `!navigator.onLine` constraints, payloads sink into an encrypted `localStorage` array.
3. **Auto-Recovery**: Background Workers universally poll for Wi-Fi recovery firing isolated Batches to `/api/sync` instantly archiving them back into the Administrator's Mainframe.

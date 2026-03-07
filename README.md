# Wasla CRM 

A fast, offline-first Lead Management Engine designed for high-velocity Exhibition Environments like Batimatec.

## Quick Start Guide

Follow these simple steps to clone the repository and get the app running on your local machine.

### 1. Clone the Repository
Open your terminal and clone the project:
```bash
git clone https://github.com/mohammedimohamed/wasla.git
cd wasla
```

### 2. Install Dependencies
Make sure you have Node.js (version 18+) installed, then run:
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory. You can copy the contents of `.env.example`:
```bash
cp .env.example .env
```
*(If you are on Windows, simply duplicate the `.env.example` file and rename the copy to `.env`)*

### 4. Initialize Database
Run the seed script to create the local SQLite database and populate the default administrator account:
```bash
npm run seed
```

### 5. Run the Application

**For Development (Live Reload):**
```bash
npm run dev
```

**For Production (Optimized & Offline capabilities enabled):**
```bash
npm run build
npm start
```

The app will now be available on your local network on port `3000`. 
* Example: `http://localhost:3000` or `http://192.168.x.x:3000`

---

## Default Administrator Login
Once the app is running, go to `/admin/login` and use the following credentials:
- **Email:** `admin@wasla.dz`
- **Password:** `admin123`

## Useful Commands
- `npm run db:reset` - Wipes all scanned leads and resets reward inventory to 0 (useful right before a new event begins, without deleting your sales agent accounts or settings).

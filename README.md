# TMR Blockchain Explorer

This folder contains a simple mobile-friendly explorer frontend.

## Run locally
Open `index.html` with a static server.

## API
The frontend defaults to:
https://tmr-blockchain.vercel.app

It uses:
- `/api/network`
- `/api/blocks`
- `/api/blocks/:height`

The frontend is intentionally separate from the blockchain backend.


# TMR Blockchain — Persistent Database Edition

This version replaces the previous in-memory explorer data with PostgreSQL persistence.

## What is persistent?

- Blocks
- Transactions
- Validators
- Validator reputation fields
- Reputation events
- Chain metadata

## Important

The repository does NOT contain a database password or database server.

You must create a PostgreSQL database and add `DATABASE_URL` to Vercel Environment Variables.

The application automatically creates its tables and a genesis block on first successful connection.

It does NOT seed demo transactions or demo blocks.

## Vercel

1. Create a PostgreSQL database (Neon/Supabase/Vercel Postgres or another PostgreSQL provider).
2. Copy its connection string.
3. In Vercel:
   Project → Settings → Environment Variables
4. Add:
   `DATABASE_URL`
5. Redeploy.
6. Open:
   `/api/health`

Expected storage response:

```json
{
  "storage": "PostgreSQL",
  "persistent": true
}
```

## Local

Create `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
NODE_ENV=development
```

Then:

```bash
npm install
npm start
```

The database tables are created automatically.

## API

- GET `/api`
- GET `/api/health`
- GET `/api/network`
- GET `/api/blocks`
- GET `/api/blocks/:height`
- GET `/api/transactions`
- GET `/api/transactions/:hash`
- GET `/api/validators`
- GET `/api/validators/:id`
- GET `/api/address/:address`
- GET `/api/search?q=...`

## Security

Do not upload `.env` or a real `DATABASE_URL` to GitHub.

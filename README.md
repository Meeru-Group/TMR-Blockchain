# TMR Blockchain Node + PostgreSQL

This is the **node**, not a Vercel RPC gateway.

## Architecture

Oracle Cloud/VPS:
- Node.js persistent process
- PostgreSQL persistent database
- TMR block production
- Transaction pool
- Block/transaction/validator APIs
- Explorer UI

Vercel is not required for the blockchain node. You can optionally put a separate frontend/explorer on Vercel.

## Run on Oracle Cloud

Install Node.js 22 and PostgreSQL, create a database, then:

```bash
npm install
cp .env.example .env
# edit DATABASE_URL and node settings
npm start
```

The node listens on port 3000.

## Endpoints

- `GET /health`
- `GET /api/network`
- `GET /api/blocks`
- `GET /api/blocks/:height-or-hash`
- `GET /api/transactions`
- `GET /api/transactions/:hash`
- `GET /api/validators`
- `POST /api/transactions`
- `POST /api/blocks/produce`

If `API_KEY` is set, POST endpoints require:

`Authorization: Bearer YOUR_API_KEY`

## PostgreSQL

The database stores blocks, transactions, validators and chain metadata. It survives Node.js restarts.

## Important blockchain note

This is a working persistent single-node foundation with Proof-of-Reputation metadata and deterministic block hashing. It is **not yet a production decentralized multi-validator consensus network**. Before mainnet, add signed transactions, validator keys, peer-to-peer networking, fork choice/finality, state-transition rules, balance/account tables, replay protection and independent validator verification.

## Vercel

Do not deploy this persistent node itself to Vercel. Vercel serverless functions are not a replacement for a continuously running blockchain node. Use Oracle Cloud/VPS for the node and optionally Vercel for an explorer/frontend.
# TMR Blockchain Explorer API

This update adds an explorer-shaped API layer to the existing TMR Proof-of-Reputation server.

## New endpoints

- `GET /api/network` — network and latest block statistics
- `GET /api/blocks?limit=20` — latest blocks
- `GET /api/blocks/:height` — one block by height
- `GET /api/transactions/:hash` — one transaction by hash
- `GET /api/address/:address` — address balance and recent transactions
- `POST /api/transactions` — development/test transaction submission
- `POST /api/blocks/mine` — development/test block finalization

## Important

The explorer data layer in `blockchain.js` is **in-memory**. It is intended as the next development step and will reset when the Vercel function restarts.

For a production blockchain explorer, replace this layer with a persistent TMR node/RPC connection and a database indexer.

## Deploy

1. Push these files to the GitHub repository connected to Vercel.
2. Wait for Vercel to finish the deployment.
3. Test `/api/network`.
4. Test `/api/blocks`.
5. Test `/api/blocks/1`.
6. Copy a transaction hash from `/api/blocks` and test `/api/transactions/<hash>`.
7. Test `/api/address/tmr1user001`.

The API documentation now builds its base URL from the incoming request instead of hard-coding `localhost`.

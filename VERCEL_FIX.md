# TMR Blockchain — Vercel Fix

## What was fixed

- Removed the `functions.*.runtime` declaration that was causing:
  `Function Runtimes must have a valid version`.
- Vercel Node.js version is selected through `package.json` using `node: 22.x`.
- Added the PostgreSQL `pg` dependency used by `database.js`.
- `/rpc` is rewritten to `/api/rpc`.
- The RPC endpoint supports browser GET diagnostics and JSON-RPC POST requests.

## Vercel Environment Variables

Set these in **Project → Settings → Environment Variables**:

```text
DATABASE_URL=YOUR_POSTGRES_CONNECTION_STRING
TMR_CHAIN_ID=TMR-CHAIN-1
TMR_NETWORK=testnet
TMR_RPC_VERSION=1.1.0
```

Optional:

```text
RPC_API_KEY=YOUR_SECRET_KEY
TMR_UPSTREAM_RPC_URL=https://YOUR-REAL-TMR-NODE/rpc
```

Do not set `TMR_UPSTREAM_RPC_URL` to this same Vercel project. It must point to a separate, real TMR node if you want upstream forwarding.

## Test

Browser:

```text
https://YOUR-DOMAIN.vercel.app/rpc?method=tmr_chainId
```

Expected:

```json
{"jsonrpc":"2.0","result":"TMR-CHAIN-1","id":1}
```

Status:

```text
https://YOUR-DOMAIN.vercel.app/rpc?method=tmr_status
```

For JSON-RPC POST, send requests to:

```text
https://YOUR-DOMAIN.vercel.app/rpc
```

## Important

This Vercel deployment is an RPC gateway/serverless API. It is not itself a permanently running blockchain validator/node. A real `TMR_UPSTREAM_RPC_URL` requires a separately hosted TMR node.

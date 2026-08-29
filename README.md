# TMR Blockchain RPC — Vercel

This package is a **real JSON-RPC gateway**, not a fake blockchain database.

## Important

Vercel is the RPC HTTP gateway. The actual blockchain/node must be running somewhere reachable by HTTPS.

Set this Vercel Environment Variable:

```env
TMR_UPSTREAM_RPC_URL=https://YOUR-REAL-TMR-NODE/rpc
```

Optional:

```env
RPC_API_KEY=your-long-random-key
TMR_CHAIN_ID=TMR-CHAIN-1
TMR_NETWORK=testnet
```

## Deploy

1. Upload this project to a GitHub repository.
2. Import the repository into Vercel.
3. Add the environment variables in **Project → Settings → Environment Variables**.
4. Redeploy.
5. Test:

```text
https://YOUR-DOMAIN.vercel.app/rpc
```

The browser GET response is read-only. JSON-RPC requests should normally be sent with POST.

## Test with curl

Chain ID:

```bash
curl -X POST https://YOUR-DOMAIN.vercel.app/rpc   -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":1,"method":"tmr_chainId","params":[]}'
```

Status:

```bash
curl -X POST https://YOUR-DOMAIN.vercel.app/rpc   -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":2,"method":"tmr_status","params":[]}'
```

## Why the old endpoint failed

Opening `/rpc` directly in a browser sends a GET request. JSON-RPC transaction/method calls are normally POST requests. This gateway keeps GET available for safe browser testing and forwards real JSON-RPC POST requests to the actual TMR node.

## Security

Do **not** put a block-producer private key in a Config/public environment variable.

If a private key has already been exposed in a screenshot or shared location, rotate that key and use a new one.

This project does not store private keys and does not create fake balances or fake blocks.

# TMR RPC setup

This fixes `/rpc` as a real JSON-RPC HTTP gateway.

## Vercel Environment Variables

Set:

`TMR_UPSTREAM_RPC_URL=https://YOUR-REAL-TMR-NODE/rpc`

Optional:

`RPC_API_KEY=YOUR_LONG_RANDOM_KEY`

`TMR_CHAIN_ID=TMR-CHAIN-1`

`TMR_NETWORK=testnet`

## Browser test

Open:

`https://YOUR-DOMAIN.vercel.app/rpc`

You should get a JSON health response.

Read-only method example:

`https://YOUR-DOMAIN.vercel.app/rpc?method=tmr_chainId`

## Real JSON-RPC POST

Use POST for wallet/node clients and transactions:

```bash
curl -X POST https://YOUR-DOMAIN.vercel.app/rpc   -H "Content-Type: application/json"   -d '{"jsonrpc":"2.0","id":1,"method":"tmr_chainId","params":[]}'
```

## Important

Vercel itself is only the HTTP gateway. `TMR_UPSTREAM_RPC_URL` must point to a running, reachable TMR blockchain node.

Do not put a block-producer/private key in a public or Config environment variable. If the key from your earlier screenshot is real, rotate it.

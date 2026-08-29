# TMR Real RPC Endpoint

This project exposes `POST /rpc` as a JSON-RPC 2.0 gateway to the persistent TMR chain data layer.

## Endpoint

`https://<your-deployment>/rpc`

## Methods

- `tmr_chainId`
- `tmr_blockNumber`
- `tmr_getBlockByNumber`
- `tmr_getBlockByHash`
- `tmr_getTransactionByHash`
- `tmr_getBalance`
- `tmr_sendTransaction`
- `tmr_getNetwork`

## Important

This is a real RPC HTTP gateway for the current PostgreSQL-backed TMR chain. It does not fabricate responses. However, it is **not** a decentralized P2P node or a continuously running validator. For a production-grade independent blockchain network, validators, P2P networking, signed blocks, and consensus finality must run on persistent nodes/VMs.

`tmr_sendTransaction` inserts a real pending transaction into the chain database; confirmation still depends on the TMR block producer.

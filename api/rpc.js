const CHAIN_ID = process.env.TMR_CHAIN_ID || "TMR-CHAIN-1";
const NETWORK = process.env.TMR_NETWORK || "testnet";
const RPC_VERSION = process.env.TMR_RPC_VERSION || "1.1.0";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return res.end(JSON.stringify(body));
}

function rpcError(id, code, message, data) {
  const body = { jsonrpc: "2.0", error: { code, message }, id: id ?? null };
  if (data !== undefined) body.error.data = data;
  return body;
}

const READONLY_METHODS = new Set([
  "web3_clientVersion",
  "net_version",
  "eth_chainId",
  "tmr_chainId",
  "tmr_status",
  "tmr_getBlockHeight",
  "tmr_getBalance",
  "tmr_getBlockByHeight",
  "tmr_getBlockByHash"
]);

function getQueryPayload(req) {
  const method = req.query && req.query.method;
  if (typeof method !== "string" || !method) return null;

  let params = [];
  if (req.query.params !== undefined) {
    try {
      const parsed = JSON.parse(req.query.params);
      params = Array.isArray(parsed) ? parsed : [parsed];
    } catch (_) {
      params = [req.query.params];
    }
  }

  return {
    jsonrpc: "2.0",
    id: req.query.id !== undefined ? req.query.id : 1,
    method,
    params
  };
}

function localResponse(payload) {
  switch (payload.method) {
    case "web3_clientVersion":
      return { jsonrpc: "2.0", result: `TMR-RPC/${RPC_VERSION}`, id: payload.id };
    case "net_version":
      return { jsonrpc: "2.0", result: NETWORK, id: payload.id };
    case "eth_chainId":
      return { jsonrpc: "2.0", result: "0x0", id: payload.id };
    case "tmr_chainId":
      return { jsonrpc: "2.0", result: CHAIN_ID, id: payload.id };
    case "tmr_status":
      return {
        jsonrpc: "2.0",
        result: {
          chain: "TMR Blockchain",
          chain_id: CHAIN_ID,
          network: NETWORK,
          status: "online",
          rpc: "vercel",
          upstream_configured: Boolean(process.env.TMR_UPSTREAM_RPC_URL),
          mode: process.env.TMR_UPSTREAM_RPC_URL ? "upstream" : "gateway"
        },
        id: payload.id
      };
    default:
      return null;
  }
}

function authOK(req) {
  const key = process.env.RPC_API_KEY;
  if (!key) return true;
  return req.headers.authorization === `Bearer ${key}`;
}

async function forward(payload) {
  const url = process.env.TMR_UPSTREAM_RPC_URL;
  if (!url) {
    const local = localResponse(payload);
    return local || rpcError(payload.id, -32001, "TMR_UPSTREAM_RPC_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch (_) {
      return rpcError(payload.id, -32002, "Upstream returned non-JSON", text.slice(0, 500));
    }

    return body;
  } catch (err) {
    return rpcError(
      payload.id,
      -32003,
      err && err.name === "AbortError" ? "Upstream RPC timeout" : "Upstream RPC connection failed",
      err && err.message
    );
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, null);
  if (!authOK(req)) return json(res, 401, rpcError(null, -32010, "Unauthorized"));

  if (req.method === "GET") {
    const payload = getQueryPayload(req);

    if (!payload) {
      return json(res, 200, {
        jsonrpc: "2.0",
        result: {
          chain: "TMR Blockchain",
          chain_id: CHAIN_ID,
          network: NETWORK,
          status: "online",
          mode: "browser-readonly",
          rpc_version: RPC_VERSION,
          upstream_configured: Boolean(process.env.TMR_UPSTREAM_RPC_URL),
          post_required_for_transactions: true,
          methods: Array.from(READONLY_METHODS)
        },
        id: null
      });
    }

    if (!READONLY_METHODS.has(payload.method)) {
      return json(res, 200, rpcError(payload.id, -32601, "Method not allowed in browser-readonly mode"));
    }

    return json(res, 200, await forward(payload));
  }

  if (req.method !== "POST") {
    return json(res, 405, rpcError(null, -32600, "POST or GET required"));
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch (_) {
      return json(res, 400, rpcError(null, -32700, "Invalid JSON"));
    }
  }

  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return json(res, 400, rpcError(payload && payload.id, -32600, "Valid JSON-RPC 2.0 POST required"));
  }

  return json(res, 200, await forward(payload));
};

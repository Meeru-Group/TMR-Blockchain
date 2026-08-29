const DEFAULT_CHAIN_ID = process.env.TMR_CHAIN_ID || "TMR-CHAIN-1";
const NETWORK = process.env.TMR_NETWORK || "testnet";

function json(res, status, body) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return res.status(status).json(body);
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", error, id: id ?? null };
}

function getMethods() {
  return [
    "web3_clientVersion",
    "net_version",
    "eth_chainId",
    "tmr_chainId",
    "tmr_status",
    "tmr_getBlockHeight",
    "tmr_getBalance",
    "tmr_getBlockByHeight",
    "tmr_getBlockByHash"
  ];
}

async function callUpstream(payload) {
  const url = process.env.TMR_UPSTREAM_RPC_URL;
  if (!url) {
    return rpcError(
      payload.id,
      -32001,
      "TMR_UPSTREAM_RPC_URL is not configured"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return rpcError(payload.id, -32002, "Upstream returned non-JSON", text.slice(0, 500));
    }

    return data;
  } catch (err) {
    return rpcError(
      payload.id,
      -32003,
      err.name === "AbortError" ? "Upstream RPC timeout" : "Upstream RPC connection failed",
      err.message
    );
  } finally {
    clearTimeout(timer);
  }
}

function normalizeGetRequest(req) {
  const method = typeof req.query?.method === "string" ? req.query.method : null;
  if (!method) return null;

  let params = [];
  if (req.query?.params) {
    try {
      params = JSON.parse(req.query.params);
      if (!Array.isArray(params)) params = [params];
    } catch {
      params = [req.query.params];
    }
  }

  return {
    jsonrpc: "2.0",
    id: req.query?.id !== undefined ? Number(req.query.id) || req.query.id : 1,
    method,
    params
  };
}

function authorized(req) {
  const required = process.env.RPC_API_KEY;
  if (!required) return true;
  const header = req.headers.authorization || "";
  return header === `Bearer ${required}`;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 204, "");

  if (!authorized(req)) {
    return json(res, 401, rpcError(null, -32010, "Unauthorized"));
  }

  // Browser GET mode is intentionally read-only and useful for testing.
  if (req.method === "GET") {
    const payload = normalizeGetRequest(req);

    if (!payload) {
      return json(res, 200, {
        jsonrpc: "2.0",
        result: {
          chain_id: DEFAULT_CHAIN_ID,
          network: NETWORK,
          mode: "browser-readonly",
          rpc_version: process.env.TMR_RPC_VERSION || "1.0.0",
          post_required_for_transactions: true,
          methods: getMethods()
        },
        id: null
      });
    }

    if (!getMethods().includes(payload.method)) {
      return json(res, 200, rpcError(payload.id, -32601, "Method not allowed in browser-readonly mode"));
    }

    const result = await callUpstream(payload);
    return json(res, 200, result);
  }

  if (req.method !== "POST") {
    return json(res, 405, rpcError(null, -32600, "POST or GET required"));
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); }
    catch { return json(res, 400, rpcError(null, -32700, "Invalid JSON")); }
  }

  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return json(res, 400, rpcError(payload?.id ?? null, -32600, "Valid JSON-RPC 2.0 POST required"));
  }

  const result = await callUpstream(payload);
  return json(res, 200, result);
}

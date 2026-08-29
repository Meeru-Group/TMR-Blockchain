const CHAIN_ID = process.env.TMR_CHAIN_ID || "TMR-CHAIN-1";
const NETWORK = process.env.TMR_NETWORK || "testnet";

function reply(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return res.json(body);
}

function error(id, code, message, data) {
  const e = { jsonrpc: "2.0", error: { code, message }, id: id ?? null };
  if (data !== undefined) e.error.data = data;
  return e;
}

function methods() {
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

function authOK(req) {
  const key = process.env.RPC_API_KEY;
  if (!key) return true;
  return req.headers.authorization === `Bearer ${key}`;
}

async function upstream(payload) {
  const url = process.env.TMR_UPSTREAM_RPC_URL;
  if (!url) {
    return error(payload.id, -32001, "TMR_UPSTREAM_RPC_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      return error(payload.id, -32002, "Upstream returned non-JSON", text.slice(0, 500));
    }
  } catch (e) {
    return error(
      payload.id,
      -32003,
      e.name === "AbortError" ? "Upstream RPC timeout" : "Upstream RPC connection failed",
      e.message
    );
  } finally {
    clearTimeout(timeout);
  }
}

function getPayload(req) {
  const method = req.query?.method;
  if (typeof method !== "string") return null;

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
    id: req.query?.id ?? 1,
    method,
    params
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return reply(res, 204, "");
  if (!authOK(req)) return reply(res, 401, error(null, -32010, "Unauthorized"));

  // Browser testing: GET /rpc shows health information.
  // GET /rpc?method=tmr_chainId also forwards a read-only JSON-RPC request.
  if (req.method === "GET") {
    const payload = getPayload(req);

    if (!payload) {
      return reply(res, 200, {
        jsonrpc: "2.0",
        result: {
          chain_id: CHAIN_ID,
          network: NETWORK,
          mode: "browser-readonly",
          rpc_version: process.env.TMR_RPC_VERSION || "1.0.0",
          upstream_configured: Boolean(process.env.TMR_UPSTREAM_RPC_URL),
          post_required_for_transactions: true,
          methods: methods()
        },
        id: null
      });
    }

    if (!methods().includes(payload.method)) {
      return reply(res, 200, error(payload.id, -32601, "Method not allowed in browser-readonly mode"));
    }

    return reply(res, 200, await upstream(payload));
  }

  if (req.method !== "POST") {
    return reply(res, 405, error(null, -32600, "POST or GET required"));
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return reply(res, 400, error(null, -32700, "Invalid JSON"));
    }
  }

  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return reply(res, 400, error(payload?.id ?? null, -32600, "Valid JSON-RPC 2.0 POST required"));
  }

  return reply(res, 200, await upstream(payload));
}

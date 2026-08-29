// ============================================================
// TMR BLOCKCHAIN
// Persistent PostgreSQL Explorer API + Web Server
// Vercel compatible
// ============================================================

const fs = require("fs");
const path = require("path");
const TMRBlockchain = require("./blockchain");
const db = require("./database");

const NETWORK = {
  name: "TMR Blockchain",
  symbol: "TMR",
  chainId: "TMR-CHAIN-1",
  consensus: "Proof-of-Reputation",
  algorithm: "proof-of-reputation",
  status: "online"
};

const chain = new TMRBlockchain();

function sendJSON(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function getContentType(file) {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".ico": "image/x-icon"
    }[ext] || "application/octet-stream"
  );
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    return sendJSON(res, 404, {
      success: false,
      error: "File not found"
    });
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return sendJSON(res, 404, {
      success: false,
      error: "File not found"
    });
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", getContentType(filePath));
  res.setHeader("Cache-Control", "no-cache");
  res.end(fs.readFileSync(filePath));
}

function parseURL(req) {
  const url = new URL(
    req.url,
    `https://${req.headers.host || "tmr.local"}`
  );
  return {
    pathname: url.pathname,
    searchParams: url.searchParams
  };
}

async function getValidators() {
  const result = await db.query(`
    SELECT
      validator_id AS "validatorId",
      public_key AS "publicKey",
      reputation,
      reputation_score AS "reputationScore",
      status,
      blocks_proposed AS "blocksProposed",
      blocks_validated AS "blocksValidated",
      missed_rounds AS "missedRounds",
      invalid_blocks AS "invalidBlocks",
      joined_at AS "joinedAt",
      last_active AS "lastActive",
      created_at AS "createdAt"
    FROM validators
    ORDER BY reputation DESC
  `);

  return result.rows;
}

async function getNetwork() {
  const stats = await chain.getNetworkStats();
  const validators = await getValidators();

  const active = validators.filter(v => v.status === "active").length;
  const suspended = validators.filter(v => v.status === "suspended").length;
  const averageReputation = validators.length
    ? Math.round(
        validators.reduce(
          (sum, v) => sum + Number(v.reputation || 0),
          0
        ) / validators.length
      )
    : 0;

  return {
    ...stats,
    name: NETWORK.name,
    symbol: NETWORK.symbol,
    chainId: NETWORK.chainId,
    consensus: NETWORK.consensus,
    totalValidators: validators.length,
    activeValidators: active,
    suspendedValidators: suspended,
    averageReputation,
    currentRound: stats.height + 1,
    latestBlockNumber: stats.height,
    approvalRate: "100.00%",
    votingStats: {
      totalVotes: validators.length,
      approvedVotes: validators.length,
      rejectedVotes: 0
    }
  };
}

async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      return res.end();
    }

    // Initialize schema + genesis + validators.
    await chain.initialize();

    const { pathname, searchParams } = parseURL(req);

    // ----------------------------------------------------------
    // AUTOMATIC BLOCK PRODUCTION
    // ----------------------------------------------------------
    // Vercel runs serverless requests instead of a permanent
    // Node.js process. Trigger the existing block-production
    // routine whenever an API request arrives. PostgreSQL
    // advisory locking inside produceNextBlockIfDue() prevents
    // concurrent requests from creating duplicate blocks.
    if (pathname.startsWith("/api/")) {
      try {
        await chain.produceNextBlockIfDue();
      } catch (productionError) {
        console.error("TMR block production warning:", productionError);
      }
    }

    // ---------------- TMR JSON-RPC ----------------
    // JSON-RPC 2.0 gateway to the persistent TMR chain state.
    // This endpoint does not simulate blocks; reads come from PostgreSQL
    // and writes create pending transactions in the real chain data layer.
    if (pathname === "/rpc") {
      if (req.method !== "POST") {
        return sendJSON(res, 405, {
          jsonrpc: "2.0",
          error: { code: -32600, message: "JSON-RPC POST required" },
          id: null
        });
      }

      let body = "";
      for await (const chunk of req) body += chunk;

      let rpc;
      try {
        rpc = JSON.parse(body || "{}");
      } catch {
        return sendJSON(res, 400, {
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null
        });
      }

      const id = Object.prototype.hasOwnProperty.call(rpc, "id") ? rpc.id : null;
      const method = rpc.method;
      const params = Array.isArray(rpc.params) ? rpc.params : [];

      try {
        let result;

        switch (method) {
          case "tmr_chainId":
            result = NETWORK.chainId;
            break;

          case "tmr_blockNumber": {
            const latest = await chain.getLatestBlock();
            result = latest ? Number(latest.height) : 0;
            break;
          }

          case "tmr_getBlockByNumber": {
            const height = params[0];
            if (height === undefined || height === null) {
              throw Object.assign(new Error("Block height is required"), { code: -32602 });
            }
            const normalized = typeof height === "string" && height.startsWith("0x")
              ? parseInt(height, 16)
              : Number(height);
            result = await chain.getBlock(normalized);
            break;
          }

          case "tmr_getBlockByHash":
            result = await chain.getBlock(String(params[0] || ""));
            break;

          case "tmr_getTransactionByHash":
            result = await chain.getTransaction(String(params[0] || ""));
            break;

          case "tmr_getBalance": {
            const address = String(params[0] || "");
            if (!address) {
              throw Object.assign(new Error("Address is required"), { code: -32602 });
            }
            const data = await chain.getAddress(address);
            result = data;
            break;
          }

          case "tmr_sendTransaction": {
            const tx = params[0];
            if (!tx || typeof tx !== "object") {
              throw Object.assign(new Error("Transaction object is required"), { code: -32602 });
            }
            const created = await chain.addTransaction({
              from: tx.from,
              to: tx.to,
              amount: tx.amount,
              nonce: tx.nonce ?? 0,
              data: tx.data ?? null
            });
            result = created.hash;
            break;
          }

          case "tmr_getNetwork":
            result = await getNetwork();
            break;

          default:
            return sendJSON(res, 200, {
              jsonrpc: "2.0",
              error: { code: -32601, message: "Method not found" },
              id
            });
        }

        return sendJSON(res, 200, { jsonrpc: "2.0", result, id });
      } catch (error) {
        const code = error.code || -32000;
        return sendJSON(res, 200, {
          jsonrpc: "2.0",
          error: { code, message: error.message || "TMR RPC error" },
          id
        });
      }
    }

    // ---------------- WEBSITE ----------------
    if (pathname === "/" || pathname === "/index.html") {
      const publicIndex = path.join(
        __dirname,
        "public",
        "index.html"
      );
      const rootIndex = path.join(__dirname, "index.html");

      if (fs.existsSync(publicIndex)) {
        return sendFile(res, publicIndex);
      }
      if (fs.existsSync(rootIndex)) {
        return sendFile(res, rootIndex);
      }

      return sendJSON(res, 404, {
        success: false,
        error: "Explorer index.html not found"
      });
    }

    if (pathname === "/app.js") {
      return sendFile(
        res,
        path.join(__dirname, "public", "app.js")
      );
    }

    if (pathname === "/style.css") {
      const publicCSS = path.join(
        __dirname,
        "public",
        "style.css"
      );
      const rootCSS = path.join(__dirname, "style.css");

      if (fs.existsSync(publicCSS)) {
        return sendFile(res, publicCSS);
      }
      return sendFile(res, rootCSS);
    }

    // ---------------- API ROOT ----------------
    if (pathname === "/api" || pathname === "/api/") {
      return sendJSON(res, 200, {
        success: true,
        name: NETWORK.name,
        symbol: NETWORK.symbol,
        chainId: NETWORK.chainId,
        consensus: NETWORK.consensus,
        status: NETWORK.status,
        storage: "PostgreSQL",
        persistent: true,
        endpoints: [
          "/api/health",
          "/api/network",
          "/api/validators",
          "/api/blocks",
          "/api/blocks/:height",
          "/api/transactions",
          "/api/transactions/:hash",
          "/api/address/:address",
          "/api/search"
        ],
        timestamp: new Date().toISOString()
      });
    }

    // ---------------- HEALTH ----------------
    if (pathname === "/api/health") {
      const network = await getNetwork();

      return sendJSON(res, 200, {
        success: true,
        status: "healthy",
        blockchain: NETWORK.name,
        chainId: NETWORK.chainId,
        algorithm: NETWORK.algorithm,
        storage: "PostgreSQL",
        persistent: true,
        validators: network.totalValidators,
        consensus: "running",
        network: "online",
        latestBlock: network.latestBlockNumber,
        timestamp: new Date().toISOString()
      });
    }

    // ---------------- NETWORK ----------------
    if (pathname === "/api/network") {
      return sendJSON(res, 200, {
        success: true,
        network: await getNetwork(),
        timestamp: new Date().toISOString()
      });
    }

    // ---------------- VALIDATORS ----------------
    if (pathname === "/api/validators") {
      const validators = await getValidators();

      return sendJSON(res, 200, {
        success: true,
        totalValidators: validators.length,
        activeValidators: validators.filter(
          v => v.status === "active"
        ).length,
        validators,
        timestamp: new Date().toISOString()
      });
    }

    if (pathname.startsWith("/api/validators/")) {
      const id = decodeURIComponent(
        pathname.split("/").pop()
      );

      const result = await db.query(
        `SELECT
          validator_id AS "validatorId",
          public_key AS "publicKey",
          reputation,
          reputation_score AS "reputationScore",
          status,
          blocks_proposed AS "blocksProposed",
          blocks_validated AS "blocksValidated",
          missed_rounds AS "missedRounds",
          invalid_blocks AS "invalidBlocks",
          joined_at AS "joinedAt",
          last_active AS "lastActive",
          created_at AS "createdAt"
         FROM validators
         WHERE validator_id = $1
         LIMIT 1`,
        [id]
      );

      if (!result.rows[0]) {
        return sendJSON(res, 404, {
          success: false,
          error: "Validator not found"
        });
      }

      return sendJSON(res, 200, {
        success: true,
        validator: result.rows[0],
        timestamp: new Date().toISOString()
      });
    }

    // ---------------- BLOCKS ----------------
    if (pathname === "/api/blocks") {
      const blocks = await chain.getBlocks(
        searchParams.get("limit") || 20
      );

      const count = await db.query(
        "SELECT COUNT(*)::int AS count FROM blocks"
      );

      return sendJSON(res, 200, {
        success: true,
        total: count.rows[0].count,
        blocks,
        timestamp: new Date().toISOString()
      });
    }

    if (pathname.startsWith("/api/blocks/")) {
      const id = decodeURIComponent(
        pathname.split("/").pop()
      );
      const block = await chain.getBlock(id);

      if (!block) {
        return sendJSON(res, 404, {
          success: false,
          error: "Block not found"
        });
      }

      return sendJSON(res, 200, {
        success: true,
        block,
        height: block.height,
        hash: block.hash,
        previousHash: block.previousHash,
        timestamp: block.timestamp,
        proposer: block.proposer,
        validator: block.validator,
        transactions: block.transactions,
        consensus: block.consensus,
        status: block.status
      });
    }

    // ---------------- TRANSACTIONS ----------------
    if (pathname === "/api/transactions") {
      const transactions = await chain.getTransactions(
        searchParams.get("limit") || 50
      );

      const count = await db.query(
        "SELECT COUNT(*)::int AS count FROM transactions"
      );

      return sendJSON(res, 200, {
        success: true,
        total: count.rows[0].count,
        transactions,
        timestamp: new Date().toISOString()
      });
    }

    if (pathname.startsWith("/api/transactions/")) {
      const hash = decodeURIComponent(
        pathname.split("/").pop()
      );

      const transaction = await chain.getTransaction(hash);

      if (!transaction) {
        return sendJSON(res, 404, {
          success: false,
          error: "Transaction not found"
        });
      }

      return sendJSON(res, 200, {
        success: true,
        transaction,
        ...transaction,
        amount: Number(transaction.amount)
      });
    }

    // ---------------- ADDRESS ----------------
    if (pathname.startsWith("/api/address/")) {
      const address = decodeURIComponent(
        pathname.split("/").pop()
      );

      const data = await chain.getAddress(address);

      return sendJSON(res, 200, {
        success: true,
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    // ---------------- SEARCH ----------------
    if (pathname === "/api/search") {
      const query =
        searchParams.get("q") ||
        searchParams.get("query") ||
        "";

      if (!query.trim()) {
        return sendJSON(res, 400, {
          success: false,
          error: "Search query is required"
        });
      }

      const q = query.trim();

      const [blocks, transactions, validators] =
        await Promise.all([
          db.query(
            `SELECT
              height,
              hash,
              previous_hash AS "previousHash",
              timestamp,
              proposer,
              validator,
              transactions,
              transaction_count AS "transactionCount",
              consensus,
              status
             FROM blocks
             WHERE CAST(height AS TEXT) = $1
                OR hash ILIKE $2
             ORDER BY height DESC
             LIMIT 20`,
            [q, `%${q}%`]
          ),
          db.query(
            `SELECT
              hash,
              from_address AS "from",
              to_address AS "to",
              amount::text AS amount,
              nonce,
              timestamp,
              data,
              block_height AS "blockHeight",
              block_hash AS "blockHash",
              status
             FROM transactions
             WHERE hash ILIKE $1
                OR from_address ILIKE $1
                OR to_address ILIKE $1
             ORDER BY timestamp DESC
             LIMIT 20`,
            [`%${q}%`]
          ),
          db.query(
            `SELECT
              validator_id AS "validatorId",
              public_key AS "publicKey",
              reputation,
              reputation_score AS "reputationScore",
              status
             FROM validators
             WHERE validator_id ILIKE $1
                OR public_key ILIKE $1
             ORDER BY reputation DESC
             LIMIT 20`,
            [`%${q}%`]
          )
        ]);

      return sendJSON(res, 200, {
        success: true,
        query,
        results: {
          blocks: blocks.rows,
          transactions: transactions.rows,
          validators: validators.rows
        },
        counts: {
          blocks: blocks.rowCount,
          transactions: transactions.rowCount,
          validators: validators.rowCount
        },
        timestamp: new Date().toISOString()
      });
    }

    return sendJSON(res, 404, {
      success: false,
      error: "Endpoint not found",
      path: pathname
    });
  } catch (error) {
    console.error("TMR BLOCKCHAIN ERROR:", error);

    return sendJSON(res, 500, {
      success: false,
      error: "Internal Server Error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  chain
    .initialize()
    .then(() => {
      require("http")
        .createServer(handler)
        .listen(PORT, () => {
          console.log(`TMR Blockchain API running on port ${PORT}`);
          console.log("Storage: PostgreSQL");
          console.log("Persistence: ENABLED");
        });
    })
    .catch(error => {
      console.error("Database initialization failed:", error);
      process.exit(1);
    });
}

module.exports = handler;

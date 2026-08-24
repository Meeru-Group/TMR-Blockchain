// ============================================================
// TMR BLOCKCHAIN
// Proof-of-Reputation Explorer API + Web Server
// Vercel compatible
// ============================================================

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ============================================================
// NETWORK
// ============================================================

const NETWORK = {
  name: "TMR Blockchain",
  symbol: "TMR",
  chainId: "TMR-CHAIN-1",
  consensus: "Proof-of-Reputation",
  algorithm: "proof-of-reputation",
  status: "online"
};

// ============================================================
// VALIDATORS
// ============================================================

const validators = [
  {
    validatorId: "por-validator-001",
    publicKey: "tmr-public-key-001",
    reputation: 850,
    reputationScore: 850,
    status: "active",
    blocksProposed: 1,
    blocksValidated: 1,
    missedRounds: 0,
    invalidBlocks: 0,
    participationRate: "100.00%",
    uptime: "100.00%",
    lastActive: new Date().toISOString(),
    rewardHistory: [],
    penaltyHistory: []
  },

  {
    validatorId: "por-validator-002",
    publicKey: "tmr-public-key-002",
    reputation: 900,
    reputationScore: 900,
    status: "active",
    blocksProposed: 2,
    blocksValidated: 2,
    missedRounds: 0,
    invalidBlocks: 0,
    participationRate: "100.00%",
    uptime: "100.00%",
    lastActive: new Date().toISOString(),
    rewardHistory: [],
    penaltyHistory: []
  },

  {
    validatorId: "por-validator-003",
    publicKey: "tmr-public-key-003",
    reputation: 750,
    reputationScore: 750,
    status: "active",
    blocksProposed: 0,
    blocksValidated: 1,
    missedRounds: 0,
    invalidBlocks: 0,
    participationRate: "100.00%",
    uptime: "100.00%",
    lastActive: new Date().toISOString(),
    rewardHistory: [],
    penaltyHistory: []
  }
];

// ============================================================
// TRANSACTIONS
// ============================================================

const transactions = [
  {
    hash: crypto
      .createHash("sha256")
      .update("genesis-transaction")
      .digest("hex"),

    from: "tmr-genesis",
    to: "validator-001",
    amount: 1000,
    nonce: 0,
    blockHeight: 0,
    status: "confirmed",
    timestamp: "2026-08-13T00:00:00.000Z"
  },

  {
    hash: crypto
      .createHash("sha256")
      .update("validator-001-transaction")
      .digest("hex"),

    from: "tmr-validator-001",
    to: "validator-002",
    amount: 25,
    nonce: 1,
    blockHeight: 1,
    status: "confirmed",
    timestamp: new Date().toISOString()
  },

  {
    hash: crypto
      .createHash("sha256")
      .update("validator-002-transaction")
      .digest("hex"),

    from: "tmr-validator-002",
    to: "validator-003",
    amount: 50,
    nonce: 2,
    blockHeight: 2,
    status: "confirmed",
    timestamp: new Date().toISOString()
  }
];

// ============================================================
// BLOCKS
// ============================================================

const block1Hash = crypto
  .createHash("sha256")
  .update("tmr-block-1")
  .digest("hex");

const block2Hash = crypto
  .createHash("sha256")
  .update("tmr-block-2")
  .digest("hex");

const blocks = [
  {
    height: 0,

    hash:
      "0000000000000000000000000000000000000000000000000000000000000000",

    previousHash:
      "0000000000000000000000000000000000000000000000000000000000000000",

    timestamp: "2026-08-13T00:00:00.000Z",

    validator: "tmr-genesis",
    proposer: "tmr-genesis",

    transactions: [],

    consensus: "Proof-of-Reputation",
    status: "finalized"
  },

  {
    height: 1,

    hash: block1Hash,

    previousHash:
      "0000000000000000000000000000000000000000000000000000000000000000",

    timestamp: new Date().toISOString(),

    validator: "por-validator-001",
    proposer: "por-validator-001",

    transactions: [
      transactions[1]
    ],

    consensus: "Proof-of-Reputation",
    status: "finalized"
  },

  {
    height: 2,

    hash: block2Hash,

    previousHash: block1Hash,

    timestamp: new Date().toISOString(),

    validator: "por-validator-002",
    proposer: "por-validator-002",

    transactions: [
      transactions[2]
    ],

    consensus: "Proof-of-Reputation",
    status: "finalized"
  }
];

// ============================================================
// NETWORK STATISTICS
// ============================================================

function getNetworkStats() {
  const totalValidators = validators.length;

  const activeValidators =
    validators.filter(
      v => v.status === "active"
    ).length;

  const suspendedValidators =
    validators.filter(
      v => v.status === "suspended"
    ).length;

  const averageReputation =
    totalValidators === 0
      ? 0
      : Math.round(
          validators.reduce(
            (sum, validator) =>
              sum +
              Number(
                validator.reputationScore ||
                validator.reputation ||
                0
              ),
            0
          ) / totalValidators
        );

  const latestBlock =
    blocks.length
      ? Math.max(
          ...blocks.map(
            block => Number(block.height)
          )
        )
      : 0;

  return {
    algorithm:
      NETWORK.algorithm,

    totalValidators,

    activeValidators,

    suspendedValidators,

    averageReputation,

    currentRound:
      latestBlock + 1,

    latestBlockNumber:
      latestBlock,

    totalBlocks:
      blocks.length,

    totalTransactions:
      transactions.length,

    approvalRate:
      "100.00%",

    votingStats: {
      totalVotes:
        validators.length,

      approvedVotes:
        validators.length,

      rejectedVotes:
        0
    }
  };
}

// ============================================================
// CONTENT TYPES
// ============================================================

function getContentType(file) {
  const ext =
    path.extname(file).toLowerCase();

  const types = {
    ".html":
      "text/html; charset=utf-8",

    ".js":
      "application/javascript; charset=utf-8",

    ".css":
      "text/css; charset=utf-8",

    ".json":
      "application/json; charset=utf-8",

    ".txt":
      "text/plain; charset=utf-8",

    ".svg":
      "image/svg+xml",

    ".png":
      "image/png",

    ".jpg":
      "image/jpeg",

    ".jpeg":
      "image/jpeg",

    ".ico":
      "image/x-icon"
  };

  return (
    types[ext] ||
    "application/octet-stream"
  );
}

// ============================================================
// JSON RESPONSE
// ============================================================

function sendJSON(
  res,
  statusCode,
  data
) {
  res.statusCode =
    statusCode;

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  res.end(
    JSON.stringify(data)
  );
}

// ============================================================
// STATIC FILE
// ============================================================

function sendFile(
  res,
  filePath
) {
  try {
    if (!fs.existsSync(filePath)) {
      return sendJSON(
        res,
        404,
        {
          success: false,
          error: "File not found"
        }
      );
    }

    const stat =
      fs.statSync(filePath);

    if (!stat.isFile()) {
      return sendJSON(
        res,
        404,
        {
          success: false,
          error: "File not found"
        }
      );
    }

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      getContentType(filePath)
    );

    res.setHeader(
      "Cache-Control",
      "no-cache"
    );

    res.end(
      fs.readFileSync(filePath)
    );

  } catch (error) {
    console.error(
      "STATIC FILE ERROR:",
      error
    );

    return sendJSON(
      res,
      500,
      {
        success: false,
        error: "Unable to load file"
      }
    );
  }
}

// ============================================================
// URL PARSER
// ============================================================

function parseURL(req) {
  const url =
    new URL(
      req.url,
      `https://${req.headers.host || "tmr.local"}`
    );

  return {
    pathname:
      url.pathname,

    searchParams:
      url.searchParams
  };
}

// ============================================================
// API HANDLER
// ============================================================

async function handler(req, res) {

  try {

    // --------------------------------------------------------
    // CORS
    // --------------------------------------------------------

    if (req.method === "OPTIONS") {

      res.statusCode = 204;

      res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
      );

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

    const {
      pathname,
      searchParams
    } = parseURL(req);

    // ========================================================
    // WEBSITE
    // ========================================================

    // Main explorer page
    if (
      pathname === "/" ||
      pathname === "/index.html"
    ) {

      const publicIndex =
        path.join(
          __dirname,
          "public",
          "index.html"
        );

      const rootIndex =
        path.join(
          __dirname,
          "index.html"
        );

      if (
        fs.existsSync(publicIndex)
      ) {
        return sendFile(
          res,
          publicIndex
        );
      }

      if (
        fs.existsSync(rootIndex)
      ) {
        return sendFile(
          res,
          rootIndex
        );
      }

      return sendJSON(
        res,
        404,
        {
          success: false,
          error:
            "Explorer index.html not found"
        }
      );
    }

    // Static JavaScript
    if (
      pathname === "/app.js"
    ) {

      const file =
        path.join(
          __dirname,
          "public",
          "app.js"
        );

      return sendFile(
        res,
        file
      );
    }

    // Static CSS
    if (
      pathname === "/style.css"
    ) {

      const publicCSS =
        path.join(
          __dirname,
          "public",
          "style.css"
        );

      const rootCSS =
        path.join(
          __dirname,
          "style.css"
        );

      if (
        fs.existsSync(publicCSS)
      ) {
        return sendFile(
          res,
          publicCSS
        );
      }

      return sendFile(
        res,
        rootCSS
      );
    }

    // ========================================================
    // API ROOT
    // ========================================================

    if (
      pathname === "/api" ||
      pathname === "/api/"
    ) {

      return sendJSON(
        res,
        200,
        {
          success: true,

          name:
            NETWORK.name,

          symbol:
            NETWORK.symbol,

          chainId:
            NETWORK.chainId,

          consensus:
            NETWORK.consensus,

          status:
            NETWORK.status,

          message:
            "TMR Blockchain API is running",

          endpoints: [
            "/api/health",
            "/api/network",
            "/api/validators",
            "/api/blocks",
            "/api/transactions",
            "/api/search"
          ],

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // HEALTH
    // ========================================================

    if (
      pathname === "/api/health"
    ) {

      return sendJSON(
        res,
        200,
        {
          success: true,

          status:
            "healthy",

          blockchain:
            NETWORK.name,

          algorithm:
            NETWORK.algorithm,

          validators:
            validators.length,

          consensus:
            "running",

          network:
            "online",

          latestBlock:
            blocks[blocks.length - 1]
              ?.height ?? 0,

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // NETWORK
    // ========================================================

    if (
      pathname === "/api/network"
    ) {

      return sendJSON(
        res,
        200,
        {
          success: true,

          network: {
            name:
              NETWORK.name,

            symbol:
              NETWORK.symbol,

            chainId:
              NETWORK.chainId,

            algorithm:
              NETWORK.algorithm,

            consensus:
              NETWORK.consensus,

            status:
              NETWORK.status,

            ...getNetworkStats()
          },

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // VALIDATORS
    // ========================================================

    if (
      pathname === "/api/validators"
    ) {

      return sendJSON(
        res,
        200,
        {
          success: true,

          totalValidators:
            validators.length,

          activeValidators:
            validators.filter(
              v =>
                v.status === "active"
            ).length,

          validators,

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // SINGLE VALIDATOR
    // ========================================================

    if (
      pathname.startsWith(
        "/api/validators/"
      )
    ) {

      const validatorId =
        decodeURIComponent(
          pathname
            .split("/")
            .pop()
        );

      const validator =
        validators.find(
          v =>
            v.validatorId ===
            validatorId
        );

      if (!validator) {

        return sendJSON(
          res,
          404,
          {
            success: false,
            error:
              "Validator not found"
          }
        );
      }

      return sendJSON(
        res,
        200,
        {
          success: true,

          validator,

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // BLOCKS
    // ========================================================

    if (
      pathname === "/api/blocks"
    ) {

      let limit =
        Number(
          searchParams.get(
            "limit"
          ) || 20
        );

      if (
        !Number.isFinite(limit)
      ) {
        limit = 20;
      }

      limit =
        Math.max(
          1,
          Math.min(
            limit,
            100
          )
        );

      const latestBlocks =
        blocks
          .slice()
          .sort(
            (a, b) =>
              Number(b.height) -
              Number(a.height)
          )
          .slice(
            0,
            limit
          );

      return sendJSON(
        res,
        200,
        {
          success: true,

          total:
            blocks.length,

          blocks:
            latestBlocks,

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // SINGLE BLOCK
    // ========================================================

    if (
      pathname.startsWith(
        "/api/blocks/"
      )
    ) {

      const blockId =
        decodeURIComponent(
          pathname
            .split("/")
            .pop()
        );

      let block;

      if (
        /^\d+$/.test(
          blockId
        )
      ) {

        block =
          blocks.find(
            b =>
              Number(
                b.height
              ) ===
              Number(blockId)
          );

      } else {

        block =
          blocks.find(
            b =>
              b.hash ===
              blockId
          );
      }

      if (!block) {

        return sendJSON(
          res,
          404,
          {
            success: false,

            error:
              "Block not found"
          }
        );
      }

      return sendJSON(
        res,
        200,
        {
          success: true,

          block,

          // Also expose block fields
          // directly for compatibility
          height:
            block.height,

          hash:
            block.hash,

          previousHash:
            block.previousHash,

          timestamp:
            block.timestamp,

          proposer:
            block.proposer,

          validator:
            block.validator,

          transactions:
            block.transactions,

          consensus:
            block.consensus,

          status:
            block.status
        }
      );
    }

    // ========================================================
    // TRANSACTIONS
    // ========================================================

    if (
      pathname ===
      "/api/transactions"
    ) {

      let limit =
        Number(
          searchParams.get(
            "limit"
          ) || 50
        );

      if (
        !Number.isFinite(limit)
      ) {
        limit = 50;
      }

      limit =
        Math.max(
          1,
          Math.min(
            limit,
            100
          )
        );

      return sendJSON(
        res,
        200,
        {
          success: true,

          total:
            transactions.length,

          transactions:
            transactions
              .slice()
              .reverse()
              .slice(
                0,
                limit
              ),

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // SINGLE TRANSACTION
    // ========================================================

    if (
      pathname.startsWith(
        "/api/transactions/"
      )
    ) {

      const hash =
        decodeURIComponent(
          pathname
            .split("/")
            .pop()
        );

      const transaction =
        transactions.find(
          tx =>
            tx.hash ===
            hash
        );

      if (!transaction) {

        return sendJSON(
          res,
          404,
          {
            success: false,

            error:
              "Transaction not found"
          }
        );
      }

      return sendJSON(
        res,
        200,
        {
          success: true,

          transaction,

          // Direct fields for
          // frontend compatibility
          hash:
            transaction.hash,

          from:
            transaction.from,

          to:
            transaction.to,

          amount:
            transaction.amount,

          nonce:
            transaction.nonce,

          blockHeight:
            transaction.blockHeight,

          status:
            transaction.status,

          timestamp:
            transaction.timestamp
        }
      );
    }

    // ========================================================
    // SEARCH
    // ========================================================

    if (
      pathname ===
      "/api/search"
    ) {

      const query =
        searchParams.get("q") ||
        searchParams.get("query") ||
        "";

      if (
        !query.trim()
      ) {

        return sendJSON(
          res,
          400,
          {
            success: false,

            error:
              "Search query is required"
          }
        );
      }

      const q =
        query
          .trim()
          .toLowerCase();

      const blockResults =
        blocks.filter(
          block =>
            String(
              block.height
            ) === q ||

            String(
              block.hash
            )
              .toLowerCase()
              .includes(q)
        );

      const transactionResults =
        transactions.filter(
          tx =>
            String(
              tx.hash
            )
              .toLowerCase()
              .includes(q) ||

            String(
              tx.from
            )
              .toLowerCase()
              .includes(q) ||

            String(
              tx.to
            )
              .toLowerCase()
              .includes(q)
        );

      const validatorResults =
        validators.filter(
          validator =>
            String(
              validator.validatorId
            )
              .toLowerCase()
              .includes(q) ||

            String(
              validator.publicKey
            )
              .toLowerCase()
              .includes(q)
        );

      return sendJSON(
        res,
        200,
        {
          success: true,

          query,

          results: {
            blocks:
              blockResults,

            transactions:
              transactionResults,

            validators:
              validatorResults
          },

          counts: {
            blocks:
              blockResults.length,

            transactions:
              transactionResults.length,

            validators:
              validatorResults.length
          },

          timestamp:
            new Date().toISOString()
        }
      );
    }

    // ========================================================
    // 404
    // ========================================================

    return sendJSON(
      res,
      404,
      {
        success: false,

        error:
          "Endpoint not found",

        path:
          pathname,

        availableEndpoints: [
          "/",
          "/api",
          "/api/health",
          "/api/network",
          "/api/validators",
          "/api/blocks",
          "/api/transactions",
          "/api/search"
        ]
      }
    );

  } catch (error) {

    console.error(
      "TMR BLOCKCHAIN ERROR:",
      error
    );

    return sendJSON(
      res,
      500,
      {
        success: false,

        error:
          "Internal Server Error",

        message:
          error.message ||
          "Unknown error",

        timestamp:
          new Date().toISOString()
      }
    );
  }
}

// ============================================================
// VERCEL EXPORT
// ============================================================

module.exports = handler;

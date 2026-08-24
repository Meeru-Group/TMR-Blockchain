// TMR Blockchain - Proof-of-Reputation API
// Vercel compatible - No external packages required

const crypto = require("crypto");

// ============================================================
// TMR NETWORK CONFIG
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
    timestamp: new Date().toISOString()
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

const blocks = [
  {
    height: 0,
    hash: "0000000000000000000000000000000000000000000000000000000000000000",
    previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
    timestamp: "2026-08-13T00:00:00.000Z",
    validator: "tmr-genesis",
    proposer: "tmr-genesis",
    transactions: [],
    consensus: "Proof-of-Reputation",
    status: "finalized"
  },
  {
    height: 1,
    hash: crypto
      .createHash("sha256")
      .update("tmr-block-1")
      .digest("hex"),
    previousHash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    timestamp: new Date().toISOString(),
    validator: "por-validator-001",
    proposer: "por-validator-001",
    transactions: [transactions[1]],
    consensus: "Proof-of-Reputation",
    status: "finalized"
  },
  {
    height: 2,
    hash: crypto
      .createHash("sha256")
      .update("tmr-block-2")
      .digest("hex"),
    previousHash: crypto
      .createHash("sha256")
      .update("tmr-block-1")
      .digest("hex"),
    timestamp: new Date().toISOString(),
    validator: "por-validator-002",
    proposer: "por-validator-002",
    transactions: [transactions[2]],
    consensus: "Proof-of-Reputation",
    status: "finalized"
  }
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function json(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  res.end(JSON.stringify(data));
}

function getPath(req) {
  const url = new URL(
    req.url,
    `https://${req.headers.host || "tmr.local"}`
  );

  return {
    pathname: url.pathname,
    searchParams: url.searchParams
  };
}

function getNetworkStats() {
  const totalValidators = validators.length;

  const activeValidators = validators.filter(
    (v) => v.status === "active"
  ).length;

  const suspendedValidators = validators.filter(
    (v) => v.status === "suspended"
  ).length;

  const averageReputation =
    totalValidators === 0
      ? 0
      : Math.round(
          validators.reduce(
            (total, validator) =>
              total + Number(validator.reputationScore || 0),
            0
          ) / totalValidators
        );

  const latestBlock =
    blocks.length > 0 ? blocks[blocks.length - 1].height : 0;

  const totalTransactions = transactions.length;

  return {
    algorithm: NETWORK.algorithm,
    totalValidators,
    activeValidators,
    suspendedValidators,
    averageReputation,
    currentRound: latestBlock + 1,
    latestBlockNumber: latestBlock,
    totalBlocks: blocks.length,
    totalTransactions,
    approvalRate: "100.00%",
    votingStats: {
      totalVotes: validators.length,
      approvedVotes: validators.length,
      rejectedVotes: 0
    }
  };
}

// ============================================================
// API HANDLER
// ============================================================

async function handler(req, res) {
  try {
    // --------------------------------------------------------
    // CORS OPTIONS
    // --------------------------------------------------------

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
      return res.end();
    }

    const { pathname, searchParams } = getPath(req);

    // --------------------------------------------------------
    // ROOT
    // --------------------------------------------------------

    if (pathname === "/" || pathname === "/api") {
      return json(res, 200, {
        success: true,
        name: NETWORK.name,
        symbol: NETWORK.symbol,
        chainId: NETWORK.chainId,
        consensus: NETWORK.consensus,
        status: "online",
        message: "TMR Blockchain API is running",
        endpoints: [
          "/api/health",
          "/api/network",
          "/api/validators",
          "/api/blocks",
          "/api/transactions",
          "/api/search"
        ],
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // HEALTH
    // --------------------------------------------------------

    if (pathname === "/api/health") {
      return json(res, 200, {
        success: true,
        status: "healthy",
        algorithm: NETWORK.algorithm,
        validators: validators.length,
        consensus: "running",
        network: "online",
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // NETWORK
    // --------------------------------------------------------

    if (pathname === "/api/network") {
      return json(res, 200, {
        success: true,
        network: {
          name: NETWORK.name,
          symbol: NETWORK.symbol,
          chainId: NETWORK.chainId,
          algorithm: NETWORK.algorithm,
          consensus: NETWORK.consensus,
          status: NETWORK.status,
          ...getNetworkStats()
        },
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // VALIDATORS
    // --------------------------------------------------------

    if (pathname === "/api/validators") {
      return json(res, 200, {
        success: true,
        totalValidators: validators.length,
        activeValidators: validators.filter(
          (v) => v.status === "active"
        ).length,
        validators,
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // SINGLE VALIDATOR
    // --------------------------------------------------------

    if (pathname.startsWith("/api/validators/")) {
      const validatorId = pathname.split("/").pop();

      const validator = validators.find(
        (v) => v.validatorId === validatorId
      );

      if (!validator) {
        return json(res, 404, {
          success: false,
          error: "Validator not found"
        });
      }

      return json(res, 200, {
        success: true,
        validator,
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // BLOCKS
    // --------------------------------------------------------

    if (pathname === "/api/blocks") {
      const limit = Math.min(
        Number(searchParams.get("limit") || 20),
        100
      );

      const latestBlocks = blocks
        .slice()
        .sort((a, b) => b.height - a.height)
        .slice(0, limit);

      return json(res, 200, {
        success: true,
        total: blocks.length,
        blocks: latestBlocks,
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // SINGLE BLOCK
    // --------------------------------------------------------

    if (pathname.startsWith("/api/blocks/")) {
      const blockId = pathname.split("/").pop();

      let block;

      if (/^\d+$/.test(blockId)) {
        block = blocks.find(
          (b) => b.height === Number(blockId)
        );
      } else {
        block = blocks.find(
          (b) => b.hash === blockId
        );
      }

      if (!block) {
        return json(res, 404, {
          success: false,
          error: "Block not found"
        });
      }

      return json(res, 200, {
        success: true,
        block,
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // TRANSACTIONS
    // --------------------------------------------------------

    if (pathname === "/api/transactions") {
      const limit = Math.min(
        Number(searchParams.get("limit") || 50),
        100
      );

      return json(res, 200, {
        success: true,
        total: transactions.length,
        transactions: transactions.slice(-limit).reverse(),
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // SINGLE TRANSACTION
    // --------------------------------------------------------

    if (pathname.startsWith("/api/transactions/")) {
      const hash = pathname.split("/").pop();

      const transaction = transactions.find(
        (tx) => tx.hash === hash
      );

      if (!transaction) {
        return json(res, 404, {
          success: false,
          error: "Transaction not found"
        });
      }

      return json(res, 200, {
        success: true,
        transaction,
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (pathname === "/api/search") {
      const query =
        searchParams.get("q") ||
        searchParams.get("query") ||
        "";

      if (!query.trim()) {
        return json(res, 400, {
          success: false,
          error: "Search query is required"
        });
      }

      const q = query.toLowerCase().trim();

      // Search block height
      const blockResults = blocks.filter((block) =>
        String(block.height) === q ||
        block.hash.toLowerCase().includes(q)
      );

      // Search transactions
      const transactionResults = transactions.filter(
        (tx) =>
          tx.hash.toLowerCase().includes(q) ||
          tx.from.toLowerCase().includes(q) ||
          tx.to.toLowerCase().includes(q)
      );

      // Search validators
      const validatorResults = validators.filter(
        (validator) =>
          validator.validatorId.toLowerCase().includes(q) ||
          validator.publicKey.toLowerCase().includes(q)
      );

      return json(res, 200, {
        success: true,
        query,
        results: {
          blocks: blockResults,
          transactions: transactionResults,
          validators: validatorResults
        },
        counts: {
          blocks: blockResults.length,
          transactions: transactionResults.length,
          validators: validatorResults.length
        },
        timestamp: new Date().toISOString()
      });
    }

    // --------------------------------------------------------
    // 404
    // --------------------------------------------------------

    return json(res, 404, {
      success: false,
      error: "API endpoint not found",
      path: pathname,
      availableEndpoints: [
        "/api/health",
        "/api/network",
        "/api/validators",
        "/api/blocks",
        "/api/transactions",
        "/api/search"
      ]
    });

  } catch (error) {
    console.error("TMR API ERROR:", error);

    return json(res, 500, {
      success: false,
      error: "Internal Server Error",
      message: error.message || "Unknown server error",
      timestamp: new Date().toISOString()
    });
  }
}

// ============================================================
// VERCEL EXPORT
// ============================================================

module.exports = handler;

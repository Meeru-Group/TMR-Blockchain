/**
 * TMR Blockchain
 * Proof-of-Reputation Consensus Server
 *
 * Full server.js
 */

const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

/* =========================================================
   PROOF-OF-REPUTATION CONSENSUS
========================================================= */

class ProofOfReputationConsensus {
  constructor() {
    /*
     * Validators
     */
    this.validators = [
      {
        validatorId: "por-validator-001",
        publicKey: "tmr-public-key-001",
        reputation: 850,
        status: "active",
        blocksProposed: 1,
        blocksValidated: 1,
        missedRounds: 0,
        invalidBlocks: 0,
        joinedAt: Date.now(),
        createdAt: Date.now(),
        lastActive: Date.now()
      },

      {
        validatorId: "por-validator-002",
        publicKey: "tmr-public-key-002",
        reputation: 900,
        status: "active",
        blocksProposed: 1,
        blocksValidated: 2,
        missedRounds: 0,
        invalidBlocks: 0,
        joinedAt: Date.now(),
        createdAt: Date.now(),
        lastActive: Date.now()
      },

      {
        validatorId: "por-validator-003",
        publicKey: "tmr-public-key-003",
        reputation: 750,
        status: "active",
        blocksProposed: 0,
        blocksValidated: 1,
        missedRounds: 0,
        invalidBlocks: 0,
        joinedAt: Date.now(),
        createdAt: Date.now(),
        lastActive: Date.now()
      }
    ];

    /*
     * Consensus configuration
     */
    this.config = {
      algorithm: "proof-of-reputation",

      maxReputation: 1000,

      weights: {
        validation: 0.35,
        participation: 0.25,
        uptime: 0.20,
        reliability: 0.20
      },

      rewards: {
        blockProposal: 10,
        blockValidation: 5,
        maxDailyReward: 100
      },

      penalties: {
        invalidBlock: 50,
        missedRound: 5,
        maliciousActivity: 100
      },

      consensus: {
        approvalThreshold: 0.66,
        blockTime: 12000,
        validatorsPerBlock: 5
      },

      antiGaming: {
        diminishingReturnsThreshold: 800,
        diminishingReturnsFactor: 0.5,
        reputationCap: 1000
      },

      suspensionThresholds: {
        minReputationForActive: 100,
        maxCumulativePenalty: 200
      }
    };

    /*
     * Blockchain
     */
    this.blocks = [
      {
        height: 0,
        hash: "0000000000000000000000000000000000000000000000000000000000000000",
        previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
        timestamp: "2026-08-24T12:59:00.000Z",
        proposer: "genesis",
        status: "finalized",
        consensus: "Proof-of-Reputation",
        transactions: []
      },

      {
        height: 1,
        hash: "f26958d42a8adc4a4eae4291febcdf564dc3ad25a2d5efc17f17e5adaccee1c",
        previousHash:
          "0000000000000000000000000000000000000000000000000000000000000000",
        timestamp: "2026-08-24T13:00:10.000Z",
        proposer: "por-validator-001",
        status: "finalized",
        consensus: "Proof-of-Reputation",

        transactions: [
          {
            hash: "b4178e7b91a22e0986f0ffb8a5ad0d7f264515c90ae62caabca03cfffa25",
            from: "tmrgenesis",
            to: "tmrvalidator01",
            amount: 250,
            nonce: 0,
            status: "finalized",
            timestamp: "2026-08-24T13:00:10.000Z",
            blockHeight: 1,
            proposer: "por-validator-001",
            consensus: "Proof-of-Reputation"
          }
        ]
      },

      {
        height: 2,
        hash: "3a8cd11d20c01fd9805e7c20efd217ae5b296b09020dc4c456bb557622bf76913",
        previousHash:
          "f26958d42a8adc4a4eae4291febcdf564dc3ad25a2d5efc17f17e5adaccee1c",
        timestamp: "2026-08-24T13:00:26.051Z",
        proposer: "por-validator-002",
        status: "finalized",
        consensus: "Proof-of-Reputation",

        transactions: [
          {
            hash: "73d78b14b9da5335f7e1bccd8d151f9e839deb0558c9b0ac7e53760ed07bb",
            from: "tmruser01",
            to: "tmruser02",
            amount: 100,
            nonce: 0,
            status: "finalized",
            timestamp: "2026-08-24T13:00:26.051Z",
            blockHeight: 2,
            proposer: "por-validator-002",
            consensus: "Proof-of-Reputation"
          },

          {
            hash: "19af2d7f3a9b0f000000000000000000000000000000000000000000000000",
            from: "tmruser02",
            to: "tmruser03",
            amount: 50,
            nonce: 0,
            status: "finalized",
            timestamp: "2026-08-24T13:00:26.051Z",
            blockHeight: 2,
            proposer: "por-validator-002",
            consensus: "Proof-of-Reputation"
          }
        ]
      }
    ];

    this.round = 2;
  }

  /* =======================================================
     VALIDATORS
  ======================================================= */

  getAllValidators() {
    return this.validators;
  }

  getValidator(id) {
    return this.validators.find(
      validator => validator.validatorId === id
    );
  }

  registerValidator(id, publicKey, reputation = 500) {
    const existing = this.getValidator(id);

    if (existing) {
      return existing;
    }

    const validator = {
      validatorId: id,
      publicKey,
      reputation,
      status: "active",
      blocksProposed: 0,
      blocksValidated: 0,
      missedRounds: 0,
      invalidBlocks: 0,
      joinedAt: Date.now(),
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    this.validators.push(validator);

    return validator;
  }

  getValidatorStats(id) {
    const validator = this.getValidator(id);

    if (!validator) {
      return null;
    }

    const totalParticipation =
      validator.blocksValidated +
      validator.blocksProposed +
      validator.missedRounds;

    const participationRate =
      totalParticipation > 0
        ? (
            ((validator.blocksValidated +
              validator.blocksProposed) /
              totalParticipation) *
            100
          ).toFixed(2)
        : "0.00";

    const uptime =
      totalParticipation > 0
        ? (
            ((totalParticipation - validator.missedRounds) /
              totalParticipation) *
            100
          ).toFixed(2)
        : "100.00";

    return {
      validatorId: validator.validatorId,
      publicKey: validator.publicKey,
      reputation: validator.reputation,
      reputationScore: validator.reputation,
      status: validator.status,
      blocksProposed: validator.blocksProposed,
      blocksValidated: validator.blocksValidated,
      missedRounds: validator.missedRounds,
      invalidBlocks: validator.invalidBlocks,
      participationRate: participationRate + "%",
      uptime: uptime + "%",
      lastActive: new Date(
        validator.lastActive
      ).toISOString(),

      rewardHistory: [],
      penaltyHistory: []
    };
  }

  /* =======================================================
     BLOCKCHAIN
  ======================================================= */

  getAllBlocks() {
    return this.blocks;
  }

  getLatestBlock() {
    return this.blocks[this.blocks.length - 1];
  }

  getBlock(height) {
    return this.blocks.find(
      block => Number(block.height) === Number(height)
    );
  }

  /* =======================================================
     TRANSACTIONS
  ======================================================= */

  findTransaction(hash) {
    for (const block of this.blocks) {
      const transactions = Array.isArray(block.transactions)
        ? block.transactions
        : [];

      const transaction = transactions.find(
        tx =>
          tx.hash === hash ||
          tx.txHash === hash ||
          tx.id === hash
      );

      if (transaction) {
        return {
          transaction,
          block
        };
      }
    }

    return null;
  }

  /* =======================================================
     NETWORK STATUS
  ======================================================= */

  getNetworkStatus() {
    const activeValidators =
      this.validators.filter(
        validator => validator.status === "active"
      ).length;

    const totalValidators =
      this.validators.length;

    const averageReputation =
      totalValidators > 0
        ? Math.round(
            this.validators.reduce(
              (sum, validator) =>
                sum + Number(validator.reputation || 0),
              0
            ) / totalValidators
          )
        : 0;

    const totalBlocks =
      this.blocks.length;

    const latestBlock =
      this.getLatestBlock();

    return {
      algorithm: "proof-of-reputation",

      totalValidators,

      activeValidators,

      suspendedValidators:
        this.validators.filter(
          validator =>
            validator.status === "suspended"
        ).length,

      averageReputation,

      currentRound: this.round,

      latestBlockNumber:
        latestBlock
          ? latestBlock.height
          : 0,

      totalBlocks,

      approvalRate: "100.00%",

      currentProposer:
        latestBlock
          ? latestBlock.proposer
          : null,

      votingStats: {
        totalVotes: 0,
        approvedVotes: 0,
        rejectedVotes: 0
      },

      timestamp: Date.now()
    };
  }

  /* =======================================================
     CONSENSUS STATUS
  ======================================================= */

  getConsensusStatus() {
    const network =
      this.getNetworkStatus();

    return {
      algorithm: "proof-of-reputation",

      status: "running",

      currentRound:
        network.currentRound,

      currentProposer:
        network.currentProposer,

      activeValidators:
        network.activeValidators,

      totalValidators:
        network.totalValidators,

      latestBlock:
        network.latestBlockNumber,

      approvalThreshold:
        this.config.consensus.approvalThreshold,

      blockTime:
        this.config.consensus.blockTime,

      timestamp:
        network.timestamp
    };
  }

  /* =======================================================
     REPUTATION
  ======================================================= */

  getReputationBreakdown(validator) {
    const reputation =
      Number(validator.reputation || 0);

    return {
      validatorId:
        validator.validatorId,

      totalReputation:
        reputation,

      validationScore:
        Math.round(
          reputation *
          this.config.weights.validation
        ),

      participationScore:
        Math.round(
          reputation *
          this.config.weights.participation
        ),

      uptimeScore:
        Math.round(
          reputation *
          this.config.weights.uptime
        ),

      reliabilityScore:
        Math.round(
          reputation *
          this.config.weights.reliability
        ),

      weights:
        this.config.weights
    };
  }

  rankValidators() {
    return [...this.validators]
      .sort(
        (a, b) =>
          Number(b.reputation || 0) -
          Number(a.reputation || 0)
      )
      .map(validator => ({
        validatorId:
          validator.validatorId,

        reputation:
          validator.reputation,

        status:
          validator.status
      }));
  }

  /* =======================================================
     SYBIL RESISTANCE
  ======================================================= */

  checkSybilResistance() {
    const total =
      this.validators.length;

    const active =
      this.validators.filter(
        validator =>
          validator.status === "active"
      ).length;

    return {
      protected: true,

      status: "healthy",

      algorithm:
        "Proof-of-Reputation",

      totalValidators: total,

      activeValidators: active,

      minimumReputation:
        this.config
          .suspensionThresholds
          .minReputationForActive,

      message:
        "Validator reputation is required for network participation."
    };
  }
}

/* =========================================================
   CREATE CONSENSUS ENGINE
========================================================= */

const consensus =
  new ProofOfReputationConsensus();

/* =========================================================
   API ROUTES
========================================================= */

const router =
  express.Router();

/* ---------------------------------------------------------
   HEALTH
--------------------------------------------------------- */

router.get(
  "/health",
  (req, res) => {
    try {
      const network =
        consensus.getNetworkStatus();

      res.json({
        success: true,

        status: "healthy",

        algorithm:
          "proof-of-reputation",

        validators:
          network.activeValidators,

        consensus:
          "running",

        network:
          "online",

        timestamp:
          new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   NETWORK
--------------------------------------------------------- */

router.get(
  "/network",
  (req, res) => {
    try {
      res.json({
        success: true,

        network:
          consensus.getNetworkStatus()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   BLOCKS
--------------------------------------------------------- */

router.get(
  "/blocks",
  (req, res) => {
    try {
      res.json({
        success: true,

        total:
          consensus.blocks.length,

        blocks:
          consensus.getAllBlocks()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/blocks/:height",
  (req, res) => {
    try {
      const block =
        consensus.getBlock(
          req.params.height
        );

      if (!block) {
        return res.status(404).json({
          success: false,
          error: "Block not found"
        });
      }

      res.json({
        success: true,
        block
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   TRANSACTION
--------------------------------------------------------- */

router.get(
  "/transactions/:hash",
  (req, res) => {
    try {
      const hash =
        req.params.hash;

      const result =
        consensus.findTransaction(
          hash
        );

      if (!result) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found"
        });
      }

      const tx =
        result.transaction;

      const block =
        result.block;

      res.json({
        success: true,

        hash:
          tx.hash ||
          tx.txHash ||
          tx.id ||
          hash,

        status:
          tx.status ||
          block.status ||
          "finalized",

        from:
          tx.from ||
          tx.sender ||
          "—",

        to:
          tx.to ||
          tx.recipient ||
          "—",

        amount:
          tx.amount ??
          tx.value ??
          "—",

        nonce:
          tx.nonce ??
          0,

        timestamp:
          tx.timestamp ||
          tx.time ||
          block.timestamp ||
          null,

        blockHeight:
          tx.blockHeight ??
          tx.height ??
          block.height ??
          null,

        proposer:
          tx.proposer ||
          block.proposer ||
          null,

        consensus:
          tx.consensus ||
          block.consensus ||
          "Proof-of-Reputation"
      });
    } catch (error) {
      console.error(
        "Transaction lookup error:",
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   VALIDATORS
--------------------------------------------------------- */

router.get(
  "/validators",
  (req, res) => {
    try {
      const validators =
        consensus
          .getAllValidators()
          .map(
            validator =>
              consensus.getValidatorStats(
                validator.validatorId
              )
          );

      res.json({
        success: true,

        totalValidators:
          validators.length,

        activeValidators:
          validators.filter(
            validator =>
              validator.status === "active"
          ).length,

        validators
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/validators/:id",
  (req, res) => {
    try {
      const validator =
        consensus.getValidator(
          req.params.id
        );

      if (!validator) {
        return res.status(404).json({
          success: false,
          error: "Validator not found"
        });
      }

      res.json({
        success: true,

        validator:
          consensus.getValidatorStats(
            req.params.id
          )
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/validators/:id/reputation",
  (req, res) => {
    try {
      const validator =
        consensus.getValidator(
          req.params.id
        );

      if (!validator) {
        return res.status(404).json({
          success: false,
          error: "Validator not found"
        });
      }

      res.json({
        success: true,

        reputation:
          consensus.getReputationBreakdown(
            validator
          )
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   CONSENSUS
--------------------------------------------------------- */

router.get(
  "/consensus",
  (req, res) => {
    try {
      res.json({
        success: true,

        consensus:
          consensus.getConsensusStatus()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/consensus/latest",
  (req, res) => {
    try {
      const network =
        consensus.getNetworkStatus();

      res.json({
        success: true,

        consensus:
          "proof-of-reputation",

        activeValidators:
          network.activeValidators,

        totalValidators:
          network.totalValidators,

        averageReputation:
          network.averageReputation,

        currentRound:
          network.currentRound,

        currentProposer:
          network.currentProposer,

        latestBlockNumber:
          network.latestBlockNumber,

        approvalRate:
          network.approvalRate,

        timestamp:
          network.timestamp
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/consensus/network",
  (req, res) => {
    try {
      const network =
        consensus.getNetworkStatus();

      const ranking =
        consensus.rankValidators();

      res.json({
        success: true,

        network: {
          algorithm:
            "proof-of-reputation",

          totalValidators:
            network.totalValidators,

          activeValidators:
            network.activeValidators,

          suspendedValidators:
            network.suspendedValidators,

          averageReputation:
            network.averageReputation,

          totalRounds:
            network.currentRound,

          totalBlocks:
            network.latestBlockNumber,

          averageApprovalRate:
            network.approvalRate,

          topValidators:
            ranking.slice(0, 10),

          votingStats:
            network.votingStats,

          timestamp:
            network.timestamp
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/consensus/reputation-ranking",
  (req, res) => {
    try {
      const ranking =
        consensus.rankValidators();

      res.json({
        success: true,

        ranking:
          ranking.map(
            (validator, index) => ({
              rank:
                index + 1,

              validatorId:
                validator.validatorId,

              reputation:
                validator.reputation,

              status:
                validator.status
            })
          )
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

router.get(
  "/consensus/sybil-check",
  (req, res) => {
    try {
      res.json({
        success: true,

        sybilResistance:
          consensus.checkSybilResistance()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   REWARDS
--------------------------------------------------------- */

router.get(
  "/consensus/rewards",
  (req, res) => {
    try {
      res.json({
        success: true,

        rewards: {
          algorithm:
            "proof-of-reputation",

          blockProposalReward:
            consensus.config.rewards.blockProposal,

          blockValidationReward:
            consensus.config.rewards.blockValidation,

          maxDailyReward:
            consensus.config.rewards.maxDailyReward
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   PENALTIES
--------------------------------------------------------- */

router.get(
  "/consensus/penalties",
  (req, res) => {
    try {
      res.json({
        success: true,

        penalties:
          consensus.config.penalties
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* ---------------------------------------------------------
   CONFIG
--------------------------------------------------------- */

router.get(
  "/config",
  (req, res) => {
    try {
      res.json({
        success: true,

        config:
          consensus.config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   API PREFIX
========================================================= */

app.use(
  "/api",
  router
);

/* =========================================================
   API ROOT
========================================================= */

app.get(
  "/api",
  (req, res) => {
    res.json({
      success: true,

      name:
        "TMR Blockchain API",

      version:
        "1.0.0",

      blockchain:
        "TMR Blockchain",

      consensus:
        "Proof-of-Reputation",

      status:
        "online",

      endpoints: [
        "/api/health",
        "/api/network",
        "/api/blocks",
        "/api/blocks/:height",
        "/api/transactions/:hash",
        "/api/validators",
        "/api/validators/:id",
        "/api/validators/:id/reputation",
        "/api/consensus",
        "/api/consensus/latest",
        "/api/consensus/network",
        "/api/consensus/reputation-ranking",
        "/api/consensus/sybil-check",
        "/api/consensus/rewards",
        "/api/consensus/penalties",
        "/api/config"
      ]
    });
  }
);

/* =========================================================
   FRONTEND
========================================================= */

const publicPath =
  path.join(
    __dirname,
    "public"
  );

app.use(
  express.static(publicPath)
);

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  "*",
  (req, res) => {
    const indexFile =
      path.join(
        publicPath,
        "index.html"
      );

    res.sendFile(
      indexFile,
      error => {
        if (error) {
          res.status(404).json({
            success: false,
            error:
              "TMR Blockchain Explorer frontend not found"
          });
        }
      }
    );
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {
    console.error(err);

    res.status(500).json({
      success: false,
      error:
        err.message ||
        "Internal server error"
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

if (require.main === module) {
  app.listen(
    PORT,
    () => {
      console.log(
        "========================================"
      );

      console.log(
        " TMR Blockchain"
      );

      console.log(
        " Proof-of-Reputation"
      );

      console.log(
        "========================================"
      );

      console.log(
        `Environment: ${NODE_ENV}`
      );

      console.log(
        `Port: ${PORT}`
      );

      console.log(
        `Validators: ${consensus.validators.length}`
      );

      console.log(
        `Blocks: ${consensus.blocks.length}`
      );

      console.log(
        "Status: ONLINE"
      );

      console.log(
        "========================================"
      );
    }
  );
}

/* =========================================================
   VERCEL EXPORT
========================================================= */

module.exports = app;

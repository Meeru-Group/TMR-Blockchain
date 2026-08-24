/**
 * TMR Blockchain
 * Proof of Reputation Consensus API
 *
 * Complete API routes for:
 * - Transactions
 * - Validators
 * - Reputation
 * - Consensus
 * - Network statistics
 * - Rewards
 * - Penalties
 * - Sybil resistance
 * - Health
 * - Public configuration
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize API routes with consensus engine
 */
function initializeAPI(consensus) {

  /* =========================================================
     TRANSACTIONS
     ========================================================= */

  /**
   * GET /api/transactions/:hash
   * Get complete transaction details
   */
  router.get('/transactions/:hash', (req, res) => {
    try {
      const hash = req.params.hash;

      let foundTx = null;
      let foundBlock = null;

      const blocks =
        typeof consensus.getAllBlocks === 'function'
          ? consensus.getAllBlocks()
          : Array.isArray(consensus.blocks)
            ? consensus.blocks
            : Array.isArray(consensus.blockchain)
              ? consensus.blockchain
              : [];

      for (const block of blocks) {
        const transactions = Array.isArray(block.transactions)
          ? block.transactions
          : [];

        const tx = transactions.find(t =>
          t &&
          (
            t.hash === hash ||
            t.txHash === hash ||
            t.id === hash
          )
        );

        if (tx) {
          foundTx = tx;
          foundBlock = block;
          break;
        }
      }

      if (!foundTx) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      res.json({
        success: true,

        hash:
          foundTx.hash ||
          foundTx.txHash ||
          foundTx.id ||
          hash,

        status:
          foundTx.status ||
          foundBlock.status ||
          'finalized',

        from:
          foundTx.from ||
          foundTx.sender ||
          '—',

        to:
          foundTx.to ||
          foundTx.recipient ||
          '—',

        amount:
          foundTx.amount ??
          foundTx.value ??
          '—',

        nonce:
          foundTx.nonce ??
          0,

        timestamp:
          foundTx.timestamp ||
          foundTx.time ||
          foundBlock.timestamp ||
          null,

        blockHeight:
          foundTx.blockHeight ??
          foundTx.height ??
          foundBlock.height ??
          null,

        proposer:
          foundTx.proposer ||
          foundBlock.proposer ||
          null,

        consensus:
          foundTx.consensus ||
          foundBlock.consensus ||
          'Proof-of-Reputation'
      });

    } catch (error) {
      console.error('Transaction lookup error:', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /* =========================================================
     VALIDATORS
     ========================================================= */

  /**
   * GET /api/validators
   * Get all validators
   */
  router.get('/validators', (req, res) => {
    try {
      const validators =
        typeof consensus.getAllValidators === 'function'
          ? consensus.getAllValidators()
          : [];

      const validatorList = validators.map(v => {

        const validated =
          Number(v.blocksValidated || 0);

        const missed =
          Number(v.missedRounds || 0);

        const totalParticipation =
          validated + missed;

        const participationRate =
          totalParticipation > 0
            ? ((validated / totalParticipation) * 100).toFixed(2) + '%'
            : '0.00%';

        return {
          validatorId:
            v.validatorId ||
            v.id ||
            'unknown',

          reputation:
            v.reputationScore ??
            v.reputation ??
            0,

          status:
            v.status ||
            'unknown',

          blocksProposed:
            v.blocksProposed || 0,

          blocksValidated:
            v.blocksValidated || 0,

          missedRounds:
            v.missedRounds || 0,

          uptime:
            typeof v.getUptime === 'function'
              ? v.getUptime()
              : null,

          participationRate,

          lastActive:
            v.lastActive
              ? new Date(v.lastActive).toISOString()
              : null
        };
      });

      res.json({
        success: true,

        totalValidators:
          validatorList.length,

        activeValidators:
          validatorList.filter(
            v => v.status === 'active'
          ).length,

        validators:
          validatorList
      });

    } catch (error) {
      console.error('Validators API error:', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /api/validators/:id
   * Get specific validator
   */
  router.get('/validators/:id', (req, res) => {
    try {
      const id = req.params.id;

      const validator =
        typeof consensus.getValidator === 'function'
          ? consensus.getValidator(id)
          : null;

      if (!validator) {
        return res.status(404).json({
          success: false,
          error: 'Validator not found'
        });
      }

      let stats = validator;

      if (
        typeof consensus.getValidatorStats === 'function'
      ) {
        stats =
          consensus.getValidatorStats(id);
      }

      res.json({
        success: true,

        validator: stats
      });

    } catch (error) {
      console.error('Validator details error:', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /api/validators/:id/reputation
   * Get reputation breakdown
   */
  router.get('/validators/:id/reputation', (req, res) => {
    try {
      const id = req.params.id;

      const validator =
        typeof consensus.getValidator === 'function'
          ? consensus.getValidator(id)
          : null;

      if (!validator) {
        return res.status(404).json({
          success: false,
          error: 'Validator not found'
        });
      }

      let breakdown = {
        validatorId: id,
        reputation:
          validator.reputationScore ??
          validator.reputation ??
          0
      };

      if (
        consensus.reputationCalculator &&
        typeof consensus.reputationCalculator
          .getReputationBreakdown === 'function'
      ) {
        breakdown =
          consensus.reputationCalculator
            .getReputationBreakdown(validator);
      }

      res.json({
        success: true,

        reputation:
          breakdown
      });

    } catch (error) {
      console.error('Reputation API error:', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /* =========================================================
     CONSENSUS
     ========================================================= */

  /**
   * GET /api/consensus
   * Current consensus status
   */
  router.get('/consensus', (req, res) => {
    try {
      let status = {};

      if (
        typeof consensus.getConsensusStatus ===
        'function'
      ) {
        status =
          consensus.getConsensusStatus();
      }

      res.json({
        success: true,

        consensus:
          status
      });

    } catch (error) {
      console.error('Consensus API error:', error);

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /api/consensus/latest
   * Latest consensus round
   */
  router.get('/consensus/latest', (req, res) => {
    try {
      const network =
        typeof consensus.getNetworkStatus === 'function'
          ? consensus.getNetworkStatus()
          : {};

      res.json({
        success: true,

        consensus:
          'proof-of-reputation',

        activeValidators:
          network.activeValidators ?? 0,

        totalValidators:
          network.totalValidators ?? 0,

        averageReputation:
          network.averageReputation ?? 0,

        currentRound:
          network.currentRound ?? 0,

        currentProposer:
          network.currentProposer ?? null,

        latestBlockNumber:
          network.latestBlockNumber ?? 0,

        approvalRate:
          network.approvalRate ?? 0,

        timestamp:
          network.timestamp ||
          new Date().toISOString()
      });

    } catch (error) {
      console.error(
        'Latest consensus error:',
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /api/consensus/network
   * Network-wide statistics
   */
  router.get('/consensus/network', (req, res) => {
    try {
      const network =
        typeof consensus.getNetworkStatus === 'function'
          ? consensus.getNetworkStatus()
          : {};

      let validators = [];

      if (
        typeof consensus.getAllValidators ===
        'function'
      ) {
        validators =
          consensus.getAllValidators();
      }

      let ranking = [];

      if (
        consensus.reputationCalculator &&
        typeof consensus.reputationCalculator
          .rankValidators === 'function'
      ) {
        ranking =
          consensus.reputationCalculator
            .rankValidators(validators);
      }

      res.json({
        success: true,

        network: {
          algorithm:
            'proof-of-reputation',

          totalValidators:
            network.totalValidators ?? validators.length,

          activeValidators:
            network.activeValidators ??
            validators.filter(
              v => v.status === 'active'
            ).length,

          suspendedValidators:
            network.suspendedValidators ?? 0,

          averageReputation:
            network.averageReputation ?? 0,

          totalRounds:
            network.currentRound ?? 0,

          totalBlocks:
            network.latestBlockNumber ?? 0,

          averageApprovalRate:
            network.approvalRate ?? 0,

          topValidators:
            ranking.slice(0, 10),

          votingStats:
            network.votingStats || {},

          timestamp:
            network.timestamp ||
            new Date().toISOString()
        }
      });

    } catch (error) {
      console.error(
        'Network statistics error:',
        error
      );

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /**
   * GET /api/consensus/reputation-ranking
   * Validators ranked by reputation
   */
  router.get(
    '/consensus/reputation-ranking',
    (req, res) => {

      try {
        const validators =
          typeof consensus.getAllValidators ===
          'function'
            ? consensus.getAllValidators()
            : [];

        let ranking = [];

        if (
          consensus.reputationCalculator &&
          typeof consensus.reputationCalculator
            .rankValidators === 'function'
        ) {
          ranking =
            consensus.reputationCalculator
              .rankValidators(validators);
        } else {
          ranking =
            [...validators].sort(
              (a, b) =>
                Number(
                  b.reputationScore ||
                  b.reputation ||
                  0
                ) -
                Number(
                  a.reputationScore ||
                  a.reputation ||
                  0
                )
            );
        }

        res.json({
          success: true,

          ranking:
            ranking.map((r, index) => ({
              rank:
                index + 1,

              validatorId:
                r.validatorId ||
                r.id,

              reputation:
                r.reputation ??
                r.reputationScore ??
                0,

              status:
                validators.find(
                  v =>
                    (v.validatorId || v.id) ===
                    (r.validatorId || r.id)
                )?.status ||
                'unknown'
            }))
        });

      } catch (error) {
        console.error(
          'Reputation ranking error:',
          error
        );

        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );


  /* =========================================================
     PENALTIES
     ========================================================= */

  /**
   * GET /api/consensus/penalties
   */
  router.get(
    '/consensus/penalties',
    (req, res) => {

      try {
        let report = [];

        if (
          consensus.penaltyEngine &&
          typeof consensus.penaltyEngine
            .getPenaltyReport === 'function'
        ) {
          report =
            consensus.penaltyEngine
              .getPenaltyReport(50);
        }

        res.json({
          success: true,

          penalties:
            report
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
     REWARDS
     ========================================================= */

  /**
   * GET /api/consensus/rewards
   */
  router.get(
    '/consensus/rewards',
    (req, res) => {

      try {
        let report = [];

        if (
          consensus.penaltyEngine &&
          typeof consensus.penaltyEngine
            .getRewardReport === 'function'
        ) {
          report =
            consensus.penaltyEngine
              .getRewardReport(50);
        }

        res.json({
          success: true,

          rewards:
            report
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
     SYBIL RESISTANCE
     ========================================================= */

  /**
   * GET /api/consensus/sybil-check
   */
  router.get(
    '/consensus/sybil-check',
    (req, res) => {

      try {
        let result = {
          status: 'unknown'
        };

        if (
          typeof consensus.checkSybilResistance ===
          'function'
        ) {
          result =
            consensus.checkSybilResistance();
        }

        res.json({
          success: true,

          sybilResistance:
            result
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
     HEALTH
     ========================================================= */

  /**
   * GET /api/health
   */
  router.get('/health', (req, res) => {

    try {
      const network =
        typeof consensus.getNetworkStatus === 'function'
          ? consensus.getNetworkStatus()
          : {};

      res.json({
        success: true,

        status:
          'healthy',

        blockchain:
          'TMR Blockchain',

        algorithm:
          'Proof-of-Reputation',

        validators:
          network.activeValidators ?? 0,

        consensus:
          (network.currentRound || 0) > 0
            ? 'running'
            : 'initializing',

        latestBlock:
          network.latestBlockNumber ?? 0,

        timestamp:
          new Date().toISOString()
      });

    } catch (error) {

      res.status(503).json({
        success: false,

        status:
          'unhealthy',

        error:
          error.message
      });
    }
  });


  /* =========================================================
     PUBLIC CONFIGURATION
     ========================================================= */

  /**
   * GET /api/config
   */
  router.get('/config', (req, res) => {

    try {
      const config =
        consensus.config || {};

      res.json({
        success: true,

        config: {
          algorithm:
            config.algorithm ||
            'proof-of-reputation',

          weights:
            config.weights || {},

          rewards:
            config.rewards || {},

          penalties:
            config.penalties || {},

          consensus:
            config.consensus || {},

          antiGaming:
            config.antiGaming || {}
        }
      });

    } catch (error) {

      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  /* =========================================================
     API INFORMATION
     ========================================================= */

  /**
   * GET /api
   * API information
   */
  router.get('/', (req, res) => {

    res.json({
      success: true,

      name:
        'TMR Blockchain API',

      version:
        '1.0.0',

      blockchain:
        'TMR Blockchain',

      consensus:
        'Proof-of-Reputation',

      endpoints: [
        '/api/health',
        '/api/validators',
        '/api/validators/:id',
        '/api/validators/:id/reputation',
        '/api/transactions/:hash',
        '/api/consensus',
        '/api/consensus/latest',
        '/api/consensus/network',
        '/api/consensus/reputation-ranking',
        '/api/consensus/penalties',
        '/api/consensus/rewards',
        '/api/consensus/sybil-check',
        '/api/config'
      ],

      timestamp:
        new Date().toISOString()
    });
  });


  /* =========================================================
     RETURN ROUTER
     ========================================================= */

  return router;
}


/**
 * Export API initializer
 */
module.exports = {
  initializeAPI
};

/**
 * TMR Blockchain
 * Proof-of-Reputation Consensus API
 *
 * API routes:
 * - Transactions
 * - Validators
 * - Reputation
 * - Consensus
 * - Network
 * - Rewards / Penalties
 * - Health
 * - Configuration
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize API routes with consensus engine
 */
function initializeAPI(consensus) {

  // ============================================================
  // TRANSACTION DETAILS
  // GET /api/transactions/:hash
  // ============================================================

  router.get('/transactions/:hash', (req, res) => {
    try {
      const hash = req.params.hash;

      let foundTx = null;
      let foundBlock = null;

      // Get blockchain blocks safely
      let blocks = [];

      if (typeof consensus.getAllBlocks === 'function') {
        blocks = consensus.getAllBlocks();
      } else if (Array.isArray(consensus.blocks)) {
        blocks = consensus.blocks;
      } else if (Array.isArray(consensus.blockchain)) {
        blocks = consensus.blockchain;
      }

      // Search transaction inside blocks
      for (const block of blocks) {
        const transactions = Array.isArray(block.transactions)
          ? block.transactions
          : [];

        const tx = transactions.find((t) => {
          if (!t) return false;

          return (
            t.hash === hash ||
            t.txHash === hash ||
            t.id === hash
          );
        });

        if (tx) {
          foundTx = tx;
          foundBlock = block;
          break;
        }
      }

      // Transaction not found
      if (!foundTx) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found'
        });
      }

      // Safely get values
      const txHash =
        foundTx.hash ||
        foundTx.txHash ||
        foundTx.id ||
        hash;

      const status =
        foundTx.status ||
        foundBlock?.status ||
        'finalized';

      const from =
        foundTx.from ||
        foundTx.sender ||
        foundTx.fromAddress ||
        '—';

      const to =
        foundTx.to ||
        foundTx.recipient ||
        foundTx.toAddress ||
        '—';

      const amount =
        foundTx.amount ??
        foundTx.value ??
        foundTx.quantity ??
        '—';

      const nonce =
        foundTx.nonce ??
        0;

      const timestamp =
        foundTx.timestamp ||
        foundTx.time ||
        foundTx.createdAt ||
        foundBlock?.timestamp ||
        foundBlock?.time ||
        null;

      const blockHeight =
        foundTx.blockHeight ??
        foundTx.height ??
        foundBlock?.height ??
        foundBlock?.blockHeight ??
        null;

      const proposer =
        foundTx.proposer ||
        foundBlock?.proposer ||
        foundBlock?.validator ||
        foundBlock?.validatorId ||
        null;

      const consensusType =
        foundTx.consensus ||
        foundBlock?.consensus ||
        consensus.config?.algorithm ||
        'Proof-of-Reputation';

      // Return complete transaction information
      return res.json({
        success: true,

        hash: txHash,

        status: status,

        from: from,

        to: to,

        amount: amount,

        nonce: nonce,

        timestamp: timestamp,

        blockHeight: blockHeight,

        proposer: proposer,

        consensus: consensusType
      });

    } catch (error) {
      console.error(
        'Transaction lookup error:',
        error
      );

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });


  // ============================================================
  // VALIDATORS
  // GET /api/validators
  // ============================================================

  router.get('/validators', (req, res) => {
    try {
      const validators =
        typeof consensus.getAllValidators === 'function'
          ? consensus.getAllValidators()
          : [];

      const validatorList = validators.map((v) => {

        const totalParticipation =
          (v.missedRounds || 0) +
          (v.blocksValidated || 0);

        const participationRate =
          totalParticipation > 0
            ? (
                (v.blocksValidated || 0) /
                totalParticipation *
                100
              ).toFixed(2) + '%'
            : '0.00%';

        return {
          validatorId: v.validatorId,
          reputation: v.reputationScore ?? 0,
          status: v.status || 'unknown',
          blocksProposed: v.blocksProposed ?? 0,
          blocksValidated: v.blocksValidated ?? 0,

          uptime:
            typeof v.getUptime === 'function'
              ? v.getUptime()
              : 0,

          participationRate,

          lastActive:
            v.lastActive
              ? new Date(v.lastActive).toISOString()
              : null
        };
      });

      return res.json({
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

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }
  });


  // ============================================================
  // SINGLE VALIDATOR
  // GET /api/validators/:id
  // ============================================================

  router.get('/validators/:id', (req, res) => {

    try {

      const validator =
        consensus.getValidator(
          req.params.id
        );

      if (!validator) {
        return res.status(404).json({
          success: false,
          error: 'Validator not found'
        });
      }

      const stats =
        consensus.getValidatorStats(
          req.params.id
        );

      return res.json({
        success: true,

        validator: {
          ...stats,

          rewardHistory:
            Array.isArray(stats.rewardHistory)
              ? stats.rewardHistory.slice(-20)
              : [],

          penaltyHistory:
            Array.isArray(stats.penaltyHistory)
              ? stats.penaltyHistory.slice(-20)
              : []
        }
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }
  });


  // ============================================================
  // VALIDATOR REPUTATION
  // GET /api/validators/:id/reputation
  // ============================================================

  router.get(
    '/validators/:id/reputation',
    (req, res) => {

      try {

        const validator =
          consensus.getValidator(
            req.params.id
          );

        if (!validator) {
          return res.status(404).json({
            success: false,
            error: 'Validator not found'
          });
        }

        const breakdown =
          consensus.reputationCalculator
            .getReputationBreakdown(
              validator
            );

        return res.json({
          success: true,
          reputation: breakdown
        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // CONSENSUS
  // GET /api/consensus
  // ============================================================

  router.get('/consensus', (req, res) => {

    try {

      const status =
        consensus.getConsensusStatus();

      return res.json({
        success: true,
        consensus: status
      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }
  });


  // ============================================================
  // LATEST CONSENSUS
  // GET /api/consensus/latest
  // ============================================================

  router.get(
    '/consensus/latest',
    (req, res) => {

      try {

        const networkStatus =
          consensus.getNetworkStatus();

        return res.json({

          success: true,

          consensus:
            'proof-of-reputation',

          activeValidators:
            networkStatus.activeValidators,

          totalValidators:
            networkStatus.totalValidators,

          averageReputation:
            networkStatus.averageReputation,

          currentRound:
            networkStatus.currentRound,

          currentProposer:
            networkStatus.currentProposer,

          latestBlockNumber:
            networkStatus.latestBlockNumber,

          approvalRate:
            networkStatus.approvalRate,

          timestamp:
            networkStatus.timestamp

        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // NETWORK
  // GET /api/consensus/network
  // ============================================================

  router.get(
    '/consensus/network',
    (req, res) => {

      try {

        const networkStatus =
          consensus.getNetworkStatus();

        const validators =
          consensus.getAllValidators();

        const ranking =
          consensus.reputationCalculator
            .rankValidators(
              validators
            );

        return res.json({

          success: true,

          network: {

            algorithm:
              'proof-of-reputation',

            totalValidators:
              networkStatus.totalValidators,

            activeValidators:
              networkStatus.activeValidators,

            suspendedValidators:
              networkStatus.suspendedValidators,

            averageReputation:
              networkStatus.averageReputation,

            totalRounds:
              networkStatus.currentRound,

            totalBlocks:
              networkStatus.latestBlockNumber,

            averageApprovalRate:
              networkStatus.approvalRate,

            topValidators:
              ranking.slice(0, 10),

            votingStats:
              networkStatus.votingStats,

            timestamp:
              networkStatus.timestamp
          }

        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // PENALTIES
  // GET /api/consensus/penalties
  // ============================================================

  router.get(
    '/consensus/penalties',
    (req, res) => {

      try {

        const report =
          consensus.penaltyEngine
            .getPenaltyReport(50);

        return res.json({
          success: true,
          penalties: report
        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // REWARDS
  // GET /api/consensus/rewards
  // ============================================================

  router.get(
    '/consensus/rewards',
    (req, res) => {

      try {

        const report =
          consensus.penaltyEngine
            .getRewardReport(50);

        return res.json({
          success: true,
          rewards: report
        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // SYBIL CHECK
  // GET /api/consensus/sybil-check
  // ============================================================

  router.get(
    '/consensus/sybil-check',
    (req, res) => {

      try {

        const sybilCheck =
          consensus.checkSybilResistance();

        return res.json({
          success: true,
          sybilResistance: sybilCheck
        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // REPUTATION RANKING
  // GET /api/consensus/reputation-ranking
  // ============================================================

  router.get(
    '/consensus/reputation-ranking',
    (req, res) => {

      try {

        const validators =
          consensus.getAllValidators();

        const ranking =
          consensus.reputationCalculator
            .rankValidators(
              validators
            );

        return res.json({

          success: true,

          ranking:
            ranking.map((r, index) => ({

              rank:
                index + 1,

              validatorId:
                r.validatorId,

              reputation:
                r.reputation,

              status:
                validators.find(
                  v =>
                    v.validatorId ===
                    r.validatorId
                )?.status || 'unknown'

            }))

        });

      } catch (error) {

        return res.status(500).json({
          success: false,
          error: error.message
        });

      }
    }
  );


  // ============================================================
  // HEALTH
  // GET /api/health
  // ============================================================

  router.get('/health', (req, res) => {

    try {

      const status =
        consensus.getNetworkStatus();

      return res.json({

        success: true,

        status: 'healthy',

        algorithm:
          'proof-of-reputation',

        validators:
          status.activeValidators,

        consensus:
          status.currentRound > 0
            ? 'running'
            : 'initializing'

      });

    } catch (error) {

      return res.status(503).json({

        success: false,

        status: 'unhealthy',

        error: error.message

      });

    }
  });


  // ============================================================
  // CONFIG
  // GET /api/config
  // ============================================================

  router.get('/config', (req, res) => {

    try {

      return res.json({

        success: true,

        config: {

          algorithm:
            consensus.config?.algorithm,

          weights:
            consensus.config?.weights,

          rewards:
            consensus.config?.rewards,

          penalties:
            consensus.config?.penalties,

          consensus:
            consensus.config?.consensus,

          antiGaming:
            consensus.config?.antiGaming

        }

      });

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });

    }
  });


  return router;
}

module.exports = {
  initializeAPI
};

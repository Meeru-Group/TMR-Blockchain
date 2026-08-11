/**
 * Proof of Reputation Consensus API
 * 
 * REST API endpoints for:
 * - Validator management
 * - Reputation queries
 * - Consensus status
 * - Historical data
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize API routes with consensus engine
 */
function initializeAPI(consensus) {
  /**
   * GET /api/validators
   * Get list of all validators
   */
  router.get('/validators', (req, res) => {
    try {
      const validators = consensus.getAllValidators();
      const validatorList = validators.map(v => ({
        validatorId: v.validatorId,
        reputation: v.reputationScore,
        status: v.status,
        blocksProposed: v.blocksProposed,
        blocksValidated: v.blocksValidated,
        uptime: v.getUptime(),
        participationRate: ((v.blocksValidated / (v.missedRounds + v.blocksValidated)) * 100).toFixed(2) + '%',
        lastActive: new Date(v.lastActive).toISOString()
      }));

      res.json({
        success: true,
        totalValidators: validatorList.length,
        activeValidators: validatorList.filter(v => v.status === 'active').length,
        validators: validatorList
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/validators/:id
   * Get specific validator details
   */
  router.get('/validators/:id', (req, res) => {
    try {
      const validator = consensus.getValidator(req.params.id);
      
      if (!validator) {
        return res.status(404).json({ success: false, error: 'Validator not found' });
      }

      const stats = consensus.getValidatorStats(req.params.id);
      
      res.json({
        success: true,
        validator: {
          ...stats,
          rewardHistory: stats.rewardHistory.slice(-20),
          penaltyHistory: stats.penaltyHistory.slice(-20)
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/validators/:id/reputation
   * Get detailed reputation breakdown for validator
   */
  router.get('/validators/:id/reputation', (req, res) => {
    try {
      const validator = consensus.getValidator(req.params.id);
      
      if (!validator) {
        return res.status(404).json({ success: false, error: 'Validator not found' });
      }

      const breakdown = consensus.reputationCalculator.getReputationBreakdown(validator);
      
      res.json({
        success: true,
        reputation: breakdown
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus
   * Get current consensus status
   */
  router.get('/consensus', (req, res) => {
    try {
      const status = consensus.getConsensusStatus();
      
      res.json({
        success: true,
        consensus: status
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/latest
   * Get latest consensus round information
   */
  router.get('/consensus/latest', (req, res) => {
    try {
      const networkStatus = consensus.getNetworkStatus();
      
      res.json({
        success: true,
        consensus: 'proof-of-reputation',
        activeValidators: networkStatus.activeValidators,
        totalValidators: networkStatus.totalValidators,
        averageReputation: networkStatus.averageReputation,
        currentRound: networkStatus.currentRound,
        currentProposer: networkStatus.currentProposer,
        latestBlockNumber: networkStatus.latestBlockNumber,
        approvalRate: networkStatus.approvalRate,
        timestamp: networkStatus.timestamp
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/network
   * Get network-wide statistics
   */
  router.get('/consensus/network', (req, res) => {
    try {
      const networkStatus = consensus.getNetworkStatus();
      const validators = consensus.getAllValidators();
      const ranking = consensus.reputationCalculator.rankValidators(validators);
      
      res.json({
        success: true,
        network: {
          algorithm: 'proof-of-reputation',
          totalValidators: networkStatus.totalValidators,
          activeValidators: networkStatus.activeValidators,
          suspendedValidators: networkStatus.suspendedValidators,
          averageReputation: networkStatus.averageReputation,
          totalRounds: networkStatus.currentRound,
          totalBlocks: networkStatus.latestBlockNumber,
          averageApprovalRate: networkStatus.approvalRate,
          topValidators: ranking.slice(0, 10),
          votingStats: networkStatus.votingStats,
          timestamp: networkStatus.timestamp
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/penalties
   * Get penalty statistics
   */
  router.get('/consensus/penalties', (req, res) => {
    try {
      const report = consensus.penaltyEngine.getPenaltyReport(50);
      
      res.json({
        success: true,
        penalties: report
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/rewards
   * Get reward statistics
   */
  router.get('/consensus/rewards', (req, res) => {
    try {
      const report = consensus.penaltyEngine.getRewardReport(50);
      
      res.json({
        success: true,
        rewards: report
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/sybil-check
   * Check network Sybil resistance status
   */
  router.get('/consensus/sybil-check', (req, res) => {
    try {
      const sybilCheck = consensus.checkSybilResistance();
      
      res.json({
        success: true,
        sybilResistance: sybilCheck
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/consensus/reputation-ranking
   * Get validator ranking by reputation
   */
  router.get('/consensus/reputation-ranking', (req, res) => {
    try {
      const validators = consensus.getAllValidators();
      const ranking = consensus.reputationCalculator.rankValidators(validators);
      
      res.json({
        success: true,
        ranking: ranking.map((r, index) => ({
          rank: index + 1,
          validatorId: r.validatorId,
          reputation: r.reputation,
          status: validators.find(v => v.validatorId === r.validatorId)?.status
        }))
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  router.get('/health', (req, res) => {
    try {
      const status = consensus.getNetworkStatus();
      
      res.json({
        success: true,
        status: 'healthy',
        algorithm: 'proof-of-reputation',
        validators: status.activeValidators,
        consensus: status.currentRound > 0 ? 'running' : 'initializing'
      });
    } catch (error) {
      res.status(503).json({ success: false, status: 'unhealthy', error: error.message });
    }
  });

  /**
   * GET /api/config
   * Get consensus configuration (public)
   */
  router.get('/config', (req, res) => {
    try {
      res.json({
        success: true,
        config: {
          algorithm: consensus.config.algorithm,
          weights: consensus.config.weights,
          rewards: consensus.config.rewards,
          penalties: consensus.config.penalties,
          consensus: consensus.config.consensus,
          antiGaming: consensus.config.antiGaming
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { initializeAPI };

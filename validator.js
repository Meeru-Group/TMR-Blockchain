/**
 * Validator Class - Represents a validator in the Proof of Reputation system
 * 
 * Each validator maintains:
 * - Reputation metrics (validation, participation, uptime, reliability)
 * - Activity tracking (blocks validated, blocks proposed, missed rounds)
 * - Penalties and rewards history
 * - On-chain identity and status
 */

const crypto = require('crypto');

class Validator {
  constructor(validatorId, publicKey, initialReputation = 500) {
    this.validatorId = validatorId;
    this.publicKey = publicKey;
    this.status = 'active'; // active, inactive, suspended
    
    // Reputation Components (0-1000)
    this.reputationScore = Math.min(initialReputation, 1000);
    this.validationScore = initialReputation * 0.35;
    this.participationScore = initialReputation * 0.25;
    this.uptimeScore = initialReputation * 0.20;
    this.reliabilityScore = initialReputation * 0.20;
    
    // Penalty tracking
    this.penaltyScore = 0;
    
    // Activity metrics
    this.blocksValidated = 0;
    this.blocksProposed = 0;
    this.missedRounds = 0;
    this.invalidBlocks = 0;
    this.totalParticipations = 0;
    
    // Timestamps
    this.lastActive = Date.now();
    this.joinedAt = Date.now();
    this.createdAt = Date.now();
    
    // History tracking
    this.rewardHistory = [];
    this.penaltyHistory = [];
    this.violationHistory = [];
    this.participationHistory = [];
    
    // Anti-gaming
    this.consecutiveRewards = 0;
    this.lastRewardTime = 0;
    this.suspiciousActivityCount = 0;
  }

  /**
   * Update last active timestamp
   */
  recordActivity() {
    this.lastActive = Date.now();
  }

  /**
   * Check if validator is eligible to participate
   */
  isEligible(config) {
    if (this.status === 'suspended') return false;
    if (this.reputationScore < config.suspensionThresholds.minReputationForActive) return false;
    
    const validatorAge = Date.now() - this.joinedAt;
    const minimumAge = config.validatorRequirements.minimumAge * 12000; // block time units
    if (validatorAge < minimumAge) return false;
    
    return true;
  }

  /**
   * Apply reward to validator reputation
   */
  applyReward(amount, reason, config) {
    const maxDaily = config.rewards.maxDailyReward;
    
    // Anti-gaming: check for excessive consecutive rewards
    const now = Date.now();
    if (now - this.lastRewardTime > 24 * 60 * 60 * 1000) {
      this.consecutiveRewards = 0;
    }
    
    // Apply diminishing returns
    let adjustedAmount = amount;
    if (this.reputationScore > config.antiGaming.diminishingReturnsThreshold) {
      adjustedAmount = amount * config.antiGaming.diminishingReturnsFactor;
    }
    
    // Cap rewards
    if (this.consecutiveRewards + adjustedAmount > maxDaily) {
      adjustedAmount = Math.max(0, maxDaily - this.consecutiveRewards);
    }
    
    this.reputationScore = Math.min(
      this.reputationScore + adjustedAmount,
      config.antiGaming.reputationCap
    );
    
    this.consecutiveRewards += adjustedAmount;
    this.lastRewardTime = now;
    
    this.rewardHistory.push({
      amount: adjustedAmount,
      reason,
      timestamp: now,
      totalReputation: this.reputationScore
    });
  }

  /**
   * Apply penalty to validator reputation
   */
  applyPenalty(amount, reason, config) {
    this.penaltyScore += Math.abs(amount);
    this.reputationScore = Math.max(0, this.reputationScore - Math.abs(amount));
    
    this.penaltyHistory.push({
      amount: -Math.abs(amount),
      reason,
      timestamp: Date.now(),
      totalReputation: this.reputationScore
    });
    
    // Check if penalty warrants suspension
    if (this.penaltyScore > config.suspensionThresholds.maxCumulativePenalty) {
      this.suspend('Accumulated penalties exceeded threshold');
    }
  }

  /**
   * Record a violation for Sybil resistance tracking
   */
  recordViolation(violationType, details = {}) {
    this.violationHistory.push({
      type: violationType,
      timestamp: Date.now(),
      details
    });
    this.suspiciousActivityCount++;
  }

  /**
   * Suspend the validator
   */
  suspend(reason = 'Malicious behavior detected') {
    this.status = 'suspended';
    this.recordViolation('suspension', { reason });
  }

  /**
   * Reactivate a suspended validator (requires governance)
   */
  reactivate() {
    if (this.status === 'suspended') {
      this.status = 'active';
      // Reset some penalties but keep history
      this.penaltyScore = Math.max(0, this.penaltyScore - 50);
    }
  }

  /**
   * Record block validation
   */
  recordBlockValidation(isValid = true) {
    this.blocksValidated++;
    this.totalParticipations++;
    this.recordActivity();
    
    this.participationHistory.push({
      type: 'validation',
      blockNumber: this.blocksValidated,
      valid: isValid,
      timestamp: Date.now()
    });
  }

  /**
   * Record block proposal
   */
  recordBlockProposal(isValid = true) {
    this.blocksProposed++;
    this.totalParticipations++;
    this.recordActivity();
    
    if (!isValid) {
      this.invalidBlocks++;
    }
    
    this.participationHistory.push({
      type: 'proposal',
      blockNumber: this.blocksProposed,
      valid: isValid,
      timestamp: Date.now()
    });
  }

  /**
   * Record missed consensus round
   */
  recordMissedRound() {
    this.missedRounds++;
  }

  /**
   * Get validator statistics
   */
  getStats() {
    const totalBlocks = this.blocksProposed + this.blocksValidated;
    const participationRate = this.totalParticipations > 0 
      ? (this.blocksValidated / (this.missedRounds + this.blocksValidated)) 
      : 0;
    
    return {
      validatorId: this.validatorId,
      reputationScore: Math.round(this.reputationScore),
      status: this.status,
      blocksProposed: this.blocksProposed,
      blocksValidated: this.blocksValidated,
      invalidBlocks: this.invalidBlocks,
      missedRounds: this.missedRounds,
      totalParticipations: this.totalParticipations,
      participationRate: (participationRate * 100).toFixed(2) + '%',
      uptime: this.getUptime(),
      penaltyScore: this.penaltyScore,
      lastActive: new Date(this.lastActive).toISOString(),
      age: this.getAge(),
      suspiciousActivityCount: this.suspiciousActivityCount
    };
  }

  /**
   * Calculate uptime percentage
   */
  getUptime() {
    if (this.totalParticipations === 0) return '100%';
    const uptime = ((this.totalParticipations - this.missedRounds) / this.totalParticipations) * 100;
    return uptime.toFixed(2) + '%';
  }

  /**
   * Get validator age in blocks
   */
  getAge() {
    const ageMs = Date.now() - this.joinedAt;
    const ageBlocks = Math.floor(ageMs / 12000); // assuming 12s block time
    return ageBlocks;
  }

  /**
   * Serialize validator data for on-chain storage
   */
  serialize() {
    return {
      validatorId: this.validatorId,
      publicKey: this.publicKey,
      reputationScore: Math.round(this.reputationScore),
      validationScore: Math.round(this.validationScore),
      participationScore: Math.round(this.participationScore),
      uptimeScore: Math.round(this.uptimeScore),
      reliabilityScore: Math.round(this.reliabilityScore),
      penaltyScore: Math.round(this.penaltyScore),
      blocksValidated: this.blocksValidated,
      blocksProposed: this.blocksProposed,
      missedRounds: this.missedRounds,
      invalidBlocks: this.invalidBlocks,
      lastActive: this.lastActive,
      status: this.status,
      joinedAt: this.joinedAt,
      createdAt: this.createdAt
    };
  }

  /**
   * Restore validator from serialized data
   */
  static deserialize(data) {
    const validator = new Validator(data.validatorId, data.publicKey, data.reputationScore);
    Object.assign(validator, data);
    return validator;
  }
}

module.exports = Validator;

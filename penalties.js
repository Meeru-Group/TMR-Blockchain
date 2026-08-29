/**
 * Penalties & Rewards Module - Validator incentive system
 * 
 * Implements:
 * - Rewards for correct participation
 * - Penalties for malicious behavior
 * - Suspension logic
 * - Anti-gaming protections
 */

class PenaltyEngine {
  constructor(config) {
    this.config = config;
    this.penaltyLog = [];
    this.rewardLog = [];
  }

  /**
   * Apply reward for valid block proposal
   */
  rewardValidBlockProposal(validator) {
    const amount = this.config.rewards.validBlockProposal;
    validator.applyReward(amount, 'Valid block proposal', this.config);
    validator.recordBlockProposal(true);
    
    this.rewardLog.push({
      type: 'valid_proposal',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply penalty for invalid block proposal
   */
  penalizeInvalidBlockProposal(validator) {
    const amount = this.config.penalties.invalidBlockProposal;
    validator.applyPenalty(amount, 'Invalid block proposal', this.config);
    validator.recordBlockProposal(false);
    
    this.penaltyLog.push({
      type: 'invalid_proposal',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply reward for correct validation
   */
  rewardCorrectValidation(validator) {
    const amount = this.config.rewards.correctValidation;
    validator.applyReward(amount, 'Correct block validation', this.config);
    validator.recordBlockValidation(true);
    
    this.rewardLog.push({
      type: 'correct_validation',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply penalty for invalid validation
   */
  penalizeInvalidValidation(validator) {
    const amount = this.config.penalties.invalidTransactionApproval;
    validator.applyPenalty(amount, 'Invalid block validation', this.config);
    validator.recordBlockValidation(false);
    
    this.penaltyLog.push({
      type: 'invalid_validation',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply penalty for double-signing
   */
  penalizeDoubleSigning(validator) {
    const amount = this.config.penalties.doubleSigning;
    validator.applyPenalty(amount, 'Double-signing detected', this.config);
    validator.recordViolation('double_signing', { severity: 'critical' });
    
    this.penaltyLog.push({
      type: 'double_signing',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now(),
      severity: 'critical'
    });

    return amount;
  }

  /**
   * Apply penalty for conflicting votes
   */
  penalizeConflictingVotes(validator) {
    const amount = this.config.penalties.conflictingVotes;
    validator.applyPenalty(amount, 'Conflicting votes', this.config);
    validator.recordViolation('conflicting_votes', { severity: 'high' });
    
    this.penaltyLog.push({
      type: 'conflicting_votes',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now(),
      severity: 'high'
    });

    return amount;
  }

  /**
   * Apply penalty for missed consensus round
   */
  penalizeMissedRound(validator) {
    const amount = this.config.penalties.missedRound;
    validator.applyPenalty(amount, 'Missed consensus round', this.config);
    validator.recordMissedRound();
    
    this.penaltyLog.push({
      type: 'missed_round',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply penalty for repeated downtime
   */
  penalizeRepeatedDowntime(validator) {
    if (validator.missedRounds < 3) {
      return 0; // Not repeated yet
    }

    const amount = this.config.penalties.repeatedDowntime;
    validator.applyPenalty(amount, 'Repeated downtime', this.config);
    
    this.penaltyLog.push({
      type: 'repeated_downtime',
      validator: validator.validatorId,
      amount,
      missedRounds: validator.missedRounds,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply penalty for malicious behavior
   */
  penalizeMaliciousBehavior(validator, reason = 'Malicious behavior') {
    const amount = this.config.penalties.maliciousBehavior;
    validator.applyPenalty(amount, reason, this.config);
    validator.recordViolation('malicious_behavior', { reason });
    
    this.penaltyLog.push({
      type: 'malicious_behavior',
      validator: validator.validatorId,
      amount,
      reason,
      timestamp: Date.now(),
      severity: 'critical'
    });

    // Automatic suspension for severe malice
    if (validator.reputationScore < 0) {
      validator.suspend(reason);
    }

    return amount;
  }

  /**
   * Apply reward for successful consensus participation
   */
  rewardConsensusParticipation(validator) {
    const amount = this.config.rewards.successfulConsensusParticipation;
    validator.applyReward(amount, 'Successful consensus participation', this.config);
    
    this.rewardLog.push({
      type: 'consensus_participation',
      validator: validator.validatorId,
      amount,
      timestamp: Date.now()
    });

    return amount;
  }

  /**
   * Apply gradual uptime reward
   */
  rewardReliableUptime(validator) {
    const amount = this.config.rewards.reliableUptimeIncrement;
    const uptime = (validator.totalParticipations - validator.missedRounds) / 
                   Math.max(1, validator.totalParticipations);
    
    // Only reward if uptime > 90%
    if (uptime > 0.90) {
      validator.applyReward(amount, 'Reliable uptime', this.config);
      
      this.rewardLog.push({
        type: 'uptime',
        validator: validator.validatorId,
        amount,
        uptime: (uptime * 100).toFixed(2) + '%',
        timestamp: Date.now()
      });

      return amount;
    }

    return 0;
  }

  /**
   * Process all violations in a round
   */
  processViolations(violations, validators) {
    const results = [];

    violations.forEach(violation => {
      const validator = validators.find(v => v.validatorId === violation.validatorId);
      if (!validator) return;

      let penalty = 0;
      switch (violation.type) {
        case 'invalid_proposal':
          penalty = this.penalizeInvalidBlockProposal(validator);
          break;
        case 'invalid_validation':
          penalty = this.penalizeInvalidValidation(validator);
          break;
        case 'double_signing':
          penalty = this.penalizeDoubleSigning(validator);
          break;
        case 'conflicting_votes':
          penalty = this.penalizeConflictingVotes(validator);
          break;
        case 'missed_round':
          penalty = this.penalizeMissedRound(validator);
          break;
        case 'malicious_behavior':
          penalty = this.penalizeMaliciousBehavior(validator, violation.reason);
          break;
      }

      results.push({
        validator: validator.validatorId,
        violation: violation.type,
        penalty,
        status: validator.status
      });
    });

    return results;
  }

  /**
   * Process all rewards in a round
   */
  processRewards(rewards, validators) {
    const results = [];

    rewards.forEach(reward => {
      const validator = validators.find(v => v.validatorId === reward.validatorId);
      if (!validator) return;

      let amount = 0;
      switch (reward.type) {
        case 'valid_proposal':
          amount = this.rewardValidBlockProposal(validator);
          break;
        case 'correct_validation':
          amount = this.rewardCorrectValidation(validator);
          break;
        case 'consensus_participation':
          amount = this.rewardConsensusParticipation(validator);
          break;
        case 'uptime':
          amount = this.rewardReliableUptime(validator);
          break;
      }

      results.push({
        validator: validator.validatorId,
        reward: reward.type,
        amount,
        newReputation: validator.reputationScore
      });
    });

    return results;
  }

  /**
   * Get penalty report
   */
  getPenaltyReport(limit = 100) {
    return {
      totalPenalties: this.penaltyLog.length,
      recentPenalties: this.penaltyLog.slice(-limit),
      penaltyTypes: this.getPenaltyStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Get reward report
   */
  getRewardReport(limit = 100) {
    return {
      totalRewards: this.rewardLog.length,
      recentRewards: this.rewardLog.slice(-limit),
      rewardTypes: this.getRewardStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate penalty statistics
   */
  getPenaltyStats() {
    const stats = {};
    
    this.penaltyLog.forEach(p => {
      if (!stats[p.type]) {
        stats[p.type] = { count: 0, total: 0 };
      }
      stats[p.type].count++;
      stats[p.type].total += Math.abs(p.amount);
    });

    return stats;
  }

  /**
   * Calculate reward statistics
   */
  getRewardStats() {
    const stats = {};
    
    this.rewardLog.forEach(r => {
      if (!stats[r.type]) {
        stats[r.type] = { count: 0, total: 0 };
      }
      stats[r.type].count++;
      stats[r.type].total += r.amount;
    });

    return stats;
  }

  /**
   * Get validator-specific penalty history
   */
  getValidatorPenalties(validatorId) {
    return this.penaltyLog.filter(p => p.validator === validatorId);
  }

  /**
   * Get validator-specific reward history
   */
  getValidatorRewards(validatorId) {
    return this.rewardLog.filter(r => r.validator === validatorId);
  }
}

module.exports = PenaltyEngine;

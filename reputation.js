/**
 * Reputation Module - Calculates dynamic reputation scores for validators
 * 
 * Reputation Formula:
 * Reputation = (validationScore * weight_validation) +
 *              (participationScore * weight_participation) +
 *              (uptimeScore * weight_uptime) +
 *              (reliabilityScore * weight_reliability) -
 *              penaltyScore
 * 
 * Normalized to range: 0 - 1000
 */

class ReputationCalculator {
  constructor(config) {
    this.config = config;
    this.weights = config.weights;
    this.maxReputation = config.maxReputation;
    this.minReputation = config.minReputation;
  }

  /**
   * Calculate complete reputation for a validator
   * @param {Validator} validator - The validator object
   * @returns {number} Reputation score (0-1000)
   */
  calculateReputation(validator) {
    const baseScore = this.calculateBaseReputation(validator);
    const withPenalties = this.applyPenalties(baseScore, validator);
    const normalized = this.normalizeReputation(withPenalties);
    return normalized;
  }

  /**
   * Calculate base reputation from weighted components
   */
  calculateBaseReputation(validator) {
    const weighted =
      (validator.validationScore * this.weights.validation) +
      (validator.participationScore * this.weights.participation) +
      (validator.uptimeScore * this.weights.uptime) +
      (validator.reliabilityScore * this.weights.reliability);

    return weighted;
  }

  /**
   * Apply penalties and adjustments
   */
  applyPenalties(baseScore, validator) {
    let adjusted = baseScore - validator.penaltyScore;
    
    // Apply age-based multiplier (newer validators get slight boost)
    const ageMultiplier = this.getAgeMultiplier(validator);
    adjusted = adjusted * ageMultiplier;
    
    // Apply diminishing returns for high reputation
    if (adjusted > this.config.antiGaming.diminishingReturnsThreshold) {
      adjusted = this.applyDiminishingReturns(adjusted);
    }
    
    return adjusted;
  }

  /**
   * Get age multiplier to incentivize long-term participation
   */
  getAgeMultiplier(validator) {
    const minAge = this.config.validatorRequirements.minimumAge;
    const validatorAge = validator.getAge();
    
    if (validatorAge < minAge) {
      // Newer validators get 90-100% of full reputation
      return 0.90 + (validatorAge / (minAge * 10)) * 0.10;
    }
    
    // Established validators get full reputation
    return 1.0;
  }

  /**
   * Apply diminishing returns for very high reputation
   */
  applyDiminishingReturns(score) {
    const threshold = this.config.antiGaming.diminishingReturnsThreshold;
    const factor = this.config.antiGaming.diminishingReturnsFactor;
    
    if (score <= threshold) {
      return score;
    }
    
    const excess = score - threshold;
    return threshold + (excess * factor);
  }

  /**
   * Normalize reputation to 0-1000 range
   */
  normalizeReputation(score) {
    let normalized = Math.max(this.minReputation, Math.min(score, this.maxReputation));
    return Math.round(normalized);
  }

  /**
   * Calculate validation score component
   * Based on: (blocksValidated - invalidBlocks) / totalParticipations
   */
  updateValidationScore(validator) {
    if (validator.totalParticipations === 0) {
      validator.validationScore = this.maxReputation * this.weights.validation;
      return;
    }

    const validValidations = validator.blocksValidated - validator.invalidBlocks;
    const validationRate = Math.max(0, validValidations / validator.totalParticipations);
    
    validator.validationScore = validationRate * this.maxReputation * this.weights.validation;
  }

  /**
   * Calculate participation score component
   * Based on: totalParticipations / maxExpectedParticipations
   */
  updateParticipationScore(validator, expectedRounds) {
    const expectedParticipations = expectedRounds * 0.8; // Assume 80% availability is excellent
    const participationRate = Math.min(1.0, validator.totalParticipations / expectedParticipations);
    
    validator.participationScore = participationRate * this.maxReputation * this.weights.participation;
  }

  /**
   * Calculate uptime score component
   * Based on: (totalParticipations - missedRounds) / totalParticipations
   */
  updateUptimeScore(validator) {
    if (validator.totalParticipations === 0) {
      validator.uptimeScore = this.maxReputation * this.weights.uptime;
      return;
    }

    const uptime = (validator.totalParticipations - validator.missedRounds) / validator.totalParticipations;
    const clampedUptime = Math.max(0, Math.min(1.0, uptime));
    
    validator.uptimeScore = clampedUptime * this.maxReputation * this.weights.uptime;
  }

  /**
   * Calculate reliability score component
   * Based on: blocksProposed / totalProposals (consistency of block production)
   */
  updateReliabilityScore(validator, totalValidators, totalRounds) {
    const expectedProposals = totalRounds / totalValidators;
    const reliability = Math.min(1.0, validator.blocksProposed / Math.max(1, expectedProposals));
    
    validator.reliabilityScore = reliability * this.maxReputation * this.weights.reliability;
  }

  /**
   * Recalculate all reputation components for a validator
   */
  recalculateAllScores(validator, totalValidators, totalRounds) {
    this.updateValidationScore(validator);
    this.updateParticipationScore(validator, totalRounds);
    this.updateUptimeScore(validator);
    this.updateReliabilityScore(validator, totalValidators, totalRounds);
    
    // Update overall reputation
    validator.reputationScore = this.calculateReputation(validator);
  }

  /**
   * Get reputation breakdown for transparency
   */
  getReputationBreakdown(validator) {
    return {
      validatorId: validator.validatorId,
      totalReputation: Math.round(validator.reputationScore),
      components: {
        validation: Math.round(validator.validationScore),
        participation: Math.round(validator.participationScore),
        uptime: Math.round(validator.uptimeScore),
        reliability: Math.round(validator.reliabilityScore),
        penalties: Math.round(validator.penaltyScore)
      },
      weights: this.weights,
      activity: {
        blocksValidated: validator.blocksValidated,
        blocksProposed: validator.blocksProposed,
        missedRounds: validator.missedRounds,
        invalidBlocks: validator.invalidBlocks,
        totalParticipations: validator.totalParticipations
      },
      status: validator.status,
      lastUpdated: Date.now()
    };
  }

  /**
   * Compare two validators' reputation
   */
  compareValidators(validator1, validator2) {
    return validator1.reputationScore - validator2.reputationScore;
  }

  /**
   * Rank validators by reputation
   */
  rankValidators(validators) {
    return validators
      .filter(v => v.status === 'active')
      .sort((a, b) => this.compareValidators(b, a))
      .map((v, index) => ({
        rank: index + 1,
        validatorId: v.validatorId,
        reputation: v.reputationScore
      }));
  }
}

module.exports = ReputationCalculator;

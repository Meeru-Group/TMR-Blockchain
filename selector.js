/**
 * Validator Selector - Selects validators for consensus rounds
 * 
 * Uses reputation-weighted deterministic selection to:
 * - Give higher reputation validators more opportunities
 * - Prevent permanent centralization
 * - Include lower-reputation validators for network resilience
 */

const crypto = require('crypto');

class ValidatorSelector {
  constructor(config, reputationCalculator) {
    this.config = config;
    this.reputationCalculator = reputationCalculator;
  }

  /**
   * Get eligible validators (active, meeting minimum requirements)
   */
  getEligibleValidators(validators) {
    return validators.filter(v => v.isEligible(this.config));
  }

  /**
   * Select proposer using reputation-weighted deterministic selection
   * 
   * Uses round number as seed for determinism while incorporating randomization
   * Validators with high reputation get higher probability of selection
   */
  selectProposer(validators, roundNumber, previousBlockHash) {
    const eligible = this.getEligibleValidators(validators);
    
    if (eligible.length === 0) {
      throw new Error('No eligible validators for proposer selection');
    }

    if (eligible.length === 1) {
      return eligible[0];
    }

    // Create deterministic seed from round number and previous block hash
    const seedInput = `${roundNumber}:${previousBlockHash}`;
    const hash = crypto.createHash('sha256').update(seedInput).digest();
    const seed = hash.readUInt32BE(0);

    // Use weighted random selection
    return this.weightedSelection(eligible, seed);
  }

  /**
   * Select validators for verification using reputation-weighted selection
   */
  selectValidators(validators, roundNumber, previousBlockHash, count = 5) {
    const eligible = this.getEligibleValidators(validators);
    
    if (eligible.length < count) {
      return eligible;
    }

    // Ensure at least 15% random selection for Sybil resistance
    const randomCount = Math.ceil(count * this.config.antiGaming.randomSelectionPercentage);
    const weightedCount = count - randomCount;

    // Get weighted selections
    const selected = new Set();
    const seedInput = `${roundNumber}:${previousBlockHash}:validators`;
    const baseHash = crypto.createHash('sha256').update(seedInput).digest();

    // Weighted selection
    for (let i = 0; i < weightedCount; i++) {
      const offset = i * 4;
      const seed = baseHash.readUInt32BE(offset % (baseHash.length - 4));
      const validator = this.weightedSelection(eligible, seed + i);
      selected.add(validator.validatorId);
    }

    // Random selection to prevent permanent bias
    const remaining = eligible.filter(v => !selected.has(v.validatorId));
    while (selected.size < count && remaining.length > 0) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      selected.add(remaining[randomIndex].validatorId);
      remaining.splice(randomIndex, 1);
    }

    return eligible.filter(v => selected.has(v.validatorId));
  }

  /**
   * Weighted random selection using cumulative distribution
   */
  weightedSelection(validators, seed) {
    if (validators.length === 0) {
      throw new Error('No validators available for selection');
    }

    // Calculate cumulative reputation weights
    const weights = validators.map(v => Math.max(1, v.reputationScore));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const normalized = weights.map(w => w / totalWeight);

    // Create cumulative distribution
    const cumulative = [];
    let sum = 0;
    for (let i = 0; i < normalized.length; i++) {
      sum += normalized[i];
      cumulative.push(sum);
    }

    // Use seed to get random value [0, 1)
    const random = (seed % 10000) / 10000;

    // Find validator at random position
    for (let i = 0; i < cumulative.length; i++) {
      if (random < cumulative[i]) {
        return validators[i];
      }
    }

    // Fallback to last validator (shouldn't happen)
    return validators[validators.length - 1];
  }

  /**
   * Rotate validators to ensure diversity
   * Higher reputation validators rotate less frequently
   */
  rotateValidators(validators, roundNumber) {
    const reputationRanking = this.reputationCalculator.rankValidators(validators);
    
    // Calculate rotation factor based on reputation ranking
    const rotated = validators.map(v => {
      const ranking = reputationRanking.find(r => r.validatorId === v.validatorId);
      if (!ranking) return v;

      // Higher rank = lower rotation frequency
      const rotationFrequency = Math.ceil(ranking.rank / validators.length * 10);
      const shouldRotate = (roundNumber % rotationFrequency) === 0;

      return {
        validator: v,
        shouldRotate,
        rotationFrequency,
        ranking: ranking.rank
      };
    });

    return rotated;
  }

  /**
   * Ensure Sybil resistance through identity tracking
   * Multiple validators with same public key or pattern are penalized
   */
  checkSybilResistance(validators) {
    const config = this.config.sybilResistance;
    
    if (!config.enabled) {
      return { issues: [] };
    }

    const issues = [];
    const publicKeyMap = {};
    const validatorIdMap = {};

    validators.forEach(v => {
      // Track public key usage
      if (publicKeyMap[v.publicKey]) {
        issues.push({
          type: 'duplicate_public_key',
          validators: [v.validatorId, publicKeyMap[v.publicKey]],
          severity: 'critical'
        });
      } else {
        publicKeyMap[v.publicKey] = v.validatorId;
      }

      // Check for suspicious patterns (many validators joining at same time)
      const ageBlocks = v.getAge();
      if (ageBlocks < 100) {
        // Young validator - monitor for Sybil patterns
        const recentValidators = validators.filter(
          other => Math.abs(other.joinedAt - v.joinedAt) < 60000 // within 1 minute
        );
        
        if (recentValidators.length > 5) {
          issues.push({
            type: 'suspicious_batch_join',
            count: recentValidators.length,
            severity: 'medium'
          });
        }
      }
    });

    return { issues, sybilSafe: issues.length === 0 };
  }

  /**
   * Get validator selection metrics for transparency
   */
  getSelectionMetrics(validators, roundNumber) {
    const eligible = this.getEligibleValidators(validators);
    const topValidators = this.reputationCalculator.rankValidators(validators).slice(0, 5);

    return {
      roundNumber,
      totalValidators: validators.length,
      eligibleValidators: eligible.length,
      totalReputation: eligible.reduce((sum, v) => sum + v.reputationScore, 0),
      averageReputation: Math.round(
        eligible.reduce((sum, v) => sum + v.reputationScore, 0) / eligible.length
      ),
      topValidators,
      suspendedValidators: validators.filter(v => v.status === 'suspended').length,
      timestamp: Date.now()
    };
  }
}

module.exports = ValidatorSelector;

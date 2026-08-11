/**
 * Voting Module - Handles validator consensus voting
 * 
 * Manages:
 * - Vote creation and signing
 * - Vote verification
 * - Vote counting and consensus determination
 * - Double-signing detection
 * - Conflicting vote detection
 */

const crypto = require('crypto');

class Vote {
  constructor(validatorId, blockHash, blockNumber, voterId) {
    this.validatorId = validatorId;
    this.blockHash = blockHash;
    this.blockNumber = blockNumber;
    this.voterId = voterId;
    this.timestamp = Date.now();
    this.signature = null;
  }

  /**
   * Sign the vote with validator's private key
   */
  sign(privateKey) {
    const message = `${this.validatorId}:${this.blockHash}:${this.blockNumber}:${this.timestamp}`;
    const signer = crypto.createSign('sha256');
    signer.update(message);
    this.signature = signer.sign(privateKey, 'hex');
    return this;
  }

  /**
   * Verify vote signature
   */
  verify(publicKey) {
    if (!this.signature) return false;
    
    const message = `${this.validatorId}:${this.blockHash}:${this.blockNumber}:${this.timestamp}`;
    const verifier = crypto.createVerify('sha256');
    verifier.update(message);
    
    try {
      return verifier.verify(publicKey, this.signature, 'hex');
    } catch (error) {
      return false;
    }
  }

  /**
   * Serialize vote
   */
  serialize() {
    return {
      validatorId: this.validatorId,
      blockHash: this.blockHash,
      blockNumber: this.blockNumber,
      voterId: this.voterId,
      timestamp: this.timestamp,
      signature: this.signature
    };
  }
}

class VotingEngine {
  constructor(config) {
    this.config = config;
    this.votes = new Map(); // blockHash -> [votes]
    this.doubleSigningViolations = new Set();
    this.conflictingVotes = new Set();
  }

  /**
   * Create a new vote
   */
  createVote(validatorId, blockHash, blockNumber, voterId) {
    return new Vote(validatorId, blockHash, blockNumber, voterId);
  }

  /**
   * Register a vote
   */
  registerVote(vote, validator) {
    if (!vote.verify(validator.publicKey)) {
      return {
        success: false,
        error: 'Invalid vote signature',
        penaltyReason: 'invalid_vote_signature'
      };
    }

    // Check for double-signing
    const existingVote = this.findValidatorVote(vote.blockHash, vote.validatorId);
    if (existingVote && existingVote.blockHash !== vote.blockHash) {
      this.doubleSigningViolations.add(vote.validatorId);
      return {
        success: false,
        error: 'Double-signing detected',
        penaltyReason: 'double_signing',
        severity: 'critical'
      };
    }

    // Store vote
    if (!this.votes.has(vote.blockHash)) {
      this.votes.set(vote.blockHash, []);
    }
    this.votes.get(vote.blockHash).push(vote);

    return { success: true };
  }

  /**
   * Find validator's vote for a block
   */
  findValidatorVote(blockHash, validatorId) {
    const blockVotes = this.votes.get(blockHash);
    if (!blockVotes) return null;
    
    return blockVotes.find(v => v.validatorId === validatorId);
  }

  /**
   * Get all votes for a block
   */
  getBlockVotes(blockHash) {
    return this.votes.get(blockHash) || [];
  }

  /**
   * Calculate approval rate for a block
   */
  calculateApprovalRate(blockHash, totalValidators) {
    const votes = this.getBlockVotes(blockHash);
    return totalValidators > 0 ? votes.length / totalValidators : 0;
  }

  /**
   * Check if block has achieved consensus
   */
  hasConsensus(blockHash, totalValidators) {
    const approvalRate = this.calculateApprovalRate(blockHash, totalValidators);
    const threshold = this.config.consensus.approvalThreshold;
    return approvalRate >= threshold;
  }

  /**
   * Detect conflicting votes (validators voting for different blocks at same height)
   */
  detectConflictingVotes(validators) {
    const blocksByHeight = new Map();
    const conflicts = [];

    // Group votes by block height
    for (const [blockHash, votes] of this.votes) {
      votes.forEach(vote => {
        const heightKey = `${vote.blockNumber}`;
        
        if (!blocksByHeight.has(heightKey)) {
          blocksByHeight.set(heightKey, []);
        }
        
        blocksByHeight.get(heightKey).push({
          blockHash,
          vote,
          validatorId: vote.validatorId
        });
      });
    }

    // Find validators voting for different blocks at same height
    for (const [heightKey, votes] of blocksByHeight) {
      const validatorVotes = new Map();
      
      votes.forEach(entry => {
        if (!validatorVotes.has(entry.validatorId)) {
          validatorVotes.set(entry.validatorId, []);
        }
        validatorVotes.get(entry.validatorId).push(entry.blockHash);
      });

      // Check for conflicts
      for (const [validatorId, hashes] of validatorVotes) {
        const uniqueHashes = new Set(hashes);
        if (uniqueHashes.size > 1) {
          conflicts.push({
            validatorId,
            blockNumber: parseInt(heightKey),
            votedForBlocks: Array.from(uniqueHashes),
            severity: 'high'
          });
          this.conflictingVotes.add(validatorId);
        }
      }
    }

    return conflicts;
  }

  /**
   * Finalize block with consensus data
   */
  finalizeBlock(block, approvers) {
    const votes = this.getBlockVotes(block.hash);
    
    block.consensus = {
      algorithm: 'proof-of-reputation',
      proposer: block.proposer,
      validators: approvers.map(a => a.validatorId),
      votes: votes.map(v => v.serialize()),
      approval: this.calculateApprovalRate(block.hash, approvers.length),
      timestamp: Date.now()
    };

    return block;
  }

  /**
   * Clear votes after block finalization (to free memory)
   */
  clearVotes(blockHash) {
    this.votes.delete(blockHash);
  }

  /**
   * Get voting statistics
   */
  getVotingStats() {
    let totalVotes = 0;
    let totalBlocks = 0;
    const averageVotesPerBlock = [];

    for (const [blockHash, votes] of this.votes) {
      totalVotes += votes.length;
      totalBlocks++;
      averageVotesPerBlock.push(votes.length);
    }

    const avgVotes = averageVotesPerBlock.length > 0 
      ? averageVotesPerBlock.reduce((a, b) => a + b, 0) / averageVotesPerBlock.length 
      : 0;

    return {
      totalVotes,
      totalBlocks: totalBlocks,
      averageVotesPerBlock: Math.round(avgVotes),
      doubleSigningViolations: this.doubleSigningViolations.size,
      conflictingVotes: this.conflictingVotes.size
    };
  }

  /**
   * Get detailed voting report for a block
   */
  getBlockVotingReport(blockHash) {
    const votes = this.getBlockVotes(blockHash);
    const uniqueValidators = new Set(votes.map(v => v.validatorId));

    return {
      blockHash,
      totalVotes: votes.length,
      uniqueValidators: uniqueValidators.size,
      validators: Array.from(uniqueValidators),
      votes: votes.map(v => v.serialize()),
      timestamp: Date.now()
    };
  }

  /**
   * Reset voting engine (after block finalization)
   */
  reset() {
    this.votes.clear();
    // Note: We keep doubleSigningViolations and conflictingVotes for penalty tracking
  }

  /**
   * Get list of validators with critical violations
   */
  getViolators() {
    return {
      doubleSigners: Array.from(this.doubleSigningViolations),
      conflictingVoters: Array.from(this.conflictingVotes)
    };
  }
}

module.exports = { Vote, VotingEngine };

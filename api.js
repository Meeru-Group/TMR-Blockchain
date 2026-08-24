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
 * GET /api/transactions/:hash
 * Get complete transaction details
 */
router.get('/transactions/:hash', (req, res) => {
   /**
 * GET /api/transactions/:hash
 * Get complete transaction details
 */
router.get('/transactions/:hash', (req, res) => {
  try {
    const hash = req.params.hash;

    let foundTx = null;
    let foundBlock = null;

    // Try to obtain blocks from the consensus engine
    let blocks = [];

    if (typeof consensus.getAllBlocks === 'function') {
      blocks = consensus.getAllBlocks() || [];
    } else if (Array.isArray(consensus.blocks)) {
      blocks = consensus.blocks;
    } else if (Array.isArray(consensus.blockchain)) {
      blocks = consensus.blockchain;
    } else if (Array.isArray(consensus.chain)) {
      blocks = consensus.chain;
    }

    // Search transaction inside blocks
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

    // If not found in blocks, try consensus transaction lookup
    if (!foundTx && typeof consensus.getTransaction === 'function') {
      foundTx = consensus.getTransaction(hash);
    }

    if (!foundTx) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Try to find the parent block using transaction block height
    if (!foundBlock) {
      const txHeight =
        foundTx.blockHeight ??
        foundTx.blockNumber ??
        foundTx.height;

      if (txHeight !== undefined && txHeight !== null) {

        if (typeof consensus.getBlock === 'function') {
          try {
            foundBlock = consensus.getBlock(Number(txHeight));
          } catch (_) {}
        }

        if (!foundBlock && typeof consensus.getBlockByHeight === 'function') {
          try {
            foundBlock = consensus.getBlockByHeight(Number(txHeight));
          } catch (_) {}
        }

        if (!foundBlock) {
          foundBlock = blocks.find(
            b => Number(b.height) === Number(txHeight)
          );
        }
      }
    }

    // Safely read block metadata
    const blockHeight =
      foundTx.blockHeight ??
      foundTx.blockNumber ??
      foundTx.height ??
      foundBlock?.height ??
      foundBlock?.blockHeight ??
      foundBlock?.blockNumber ??
      null;

    const timestamp =
      foundTx.timestamp ??
      foundTx.time ??
      foundBlock?.timestamp ??
      foundBlock?.time ??
      null;

    const proposer =
      foundTx.proposer ??
      foundBlock?.proposer ??
      foundBlock?.validator ??
      foundBlock?.validatorId ??
      null;

    const status =
      foundTx.status ??
      foundBlock?.status ??
      'finalized';

    const consensusType =
      foundTx.consensus ??
      foundBlock?.consensus ??
      'Proof-of-Reputation';

    res.json({
      success: true,

      hash:
        foundTx.hash ||
        foundTx.txHash ||
        foundTx.id ||
        hash,

      status,

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

      timestamp,

      blockHeight,

      proposer,

      consensus: consensusType
    });

  } catch (error) {
    console.error('Transaction lookup error:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

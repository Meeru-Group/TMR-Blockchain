/**
 * TMR Blockchain - Proof of Reputation Consensus Server
 * 
 * Express.js server that hosts the PoR consensus API
 * Serves the consensus network and provides REST endpoints
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const TMRBlockchain = require('./blockchain');
require('dotenv').config();

// Import consensus system (mock for deployment)
class MockProofOfReputationConsensus {
  constructor() {
    this.validators = [];
    this.blocks = [];
    this.round = 0;
    this.config = {
      algorithm: 'proof-of-reputation',
      maxReputation: 1000,
      consensus: {
        approvalThreshold: 0.66,
        blockTime: 12000,
        validatorsPerBlock: 5
      }
    };
  }

  getAllValidators() {
    return this.validators;
  }

  getNetworkStatus() {
    const activeValidators = this.validators.filter(v => v.status === 'active').length;
    const avgReputation = this.validators.length > 0
      ? Math.round(this.validators.reduce((sum, v) => sum + v.reputation, 0) / this.validators.length)
      : 0;

    return {
      algorithm: 'proof-of-reputation',
      totalValidators: this.validators.length,
      activeValidators,
      averageReputation: avgReputation,
      currentRound: this.round,
      latestBlockNumber: this.blocks.length,
      timestamp: Date.now()
    };
  }

  registerValidator(id, publicKey, reputation = 500) {
    const validator = {
      validatorId: id,
      publicKey,
      reputation,
      status: 'active',
      blocksProposed: 0,
      blocksValidated: 0,
      joinedAt: Date.now()
    };
    this.validators.push(validator);
    return validator;
  }
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize consensus
const consensus = new MockProofOfReputationConsensus();

// Explorer data layer. This is intentionally in-memory for the current Vercel
// deployment; connect this class to a persistent TMR node/RPC for production.
const blockchain = new TMRBlockchain();
blockchain.seedDemoData();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    algorithm: 'proof-of-reputation',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// Consensus Endpoints
// ============================================

/**
 * GET /api/consensus/status
 * Get current consensus status
 */
app.get('/api/consensus/status', (req, res) => {
  try {
    const status = consensus.getNetworkStatus();
    res.json({
      success: true,
      consensus: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/validators
 * Get list of all validators
 */
app.get('/api/validators', (req, res) => {
  try {
    const validators = consensus.getAllValidators();
    res.json({
      success: true,
      totalValidators: validators.length,
      validators: validators.map(v => ({
        validatorId: v.validatorId,
        reputation: v.reputation,
        status: v.status,
        blocksProposed: v.blocksProposed,
        blocksValidated: v.blocksValidated
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/validators/register
 * Register a new validator
 */
app.post('/api/validators/register', (req, res) => {
  try {
    const { validatorId, publicKey, reputation } = req.body;

    if (!validatorId || !publicKey) {
      return res.status(400).json({
        success: false,
        error: 'validatorId and publicKey are required'
      });
    }

    const validator = consensus.registerValidator(
      validatorId,
      publicKey,
      reputation || 500
    );

    res.status(201).json({
      success: true,
      validator: {
        validatorId: validator.validatorId,
        reputation: validator.reputation,
        status: validator.status,
        joinedAt: new Date(validator.joinedAt).toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/config
 * Get consensus configuration
 */
app.get('/api/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: consensus.config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// Blockchain Explorer Endpoints
// ============================================

/**
 * GET /api/network
 * Public network information for the explorer.
 */
app.get('/api/network', (req, res) => {
  res.json({ success: true, network: blockchain.getNetworkStats() });
});

/**
 * GET /api/blocks
 * Return the newest blocks first. Use ?limit=20 to change the page size.
 */
app.get('/api/blocks', (req, res) => {
  const blocks = blockchain.getBlocks(req.query.limit);
  res.json({
    success: true,
    latestHeight: blockchain.getLatestBlock().height,
    count: blocks.length,
    blocks
  });
});

/**
 * GET /api/blocks/:height
 * Return one block by height.
 */
app.get('/api/blocks/:height', (req, res) => {
  const block = blockchain.getBlock(req.params.height);
  if (!block) {
    return res.status(404).json({
      success: false,
      error: 'Block not found'
    });
  }
  res.json({ success: true, block });
});

/**
 * GET /api/transactions/:hash
 * Return a transaction by hash.
 */
app.get('/api/transactions/:hash', (req, res) => {
  const transaction = blockchain.getTransaction(req.params.hash);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      error: 'Transaction not found'
    });
  }
  res.json({ success: true, transaction });
});

/**
 * GET /api/address/:address
 * Return address balance and recent transactions.
 */
app.get('/api/address/:address', (req, res) => {
  res.json({
    success: true,
    account: blockchain.getAddress(req.params.address)
  });
});

/**
 * POST /api/transactions
 * Add a transaction to the pending pool.
 * This endpoint is for development/testing until a signed transaction
 * system is connected to the real TMR node.
 */
app.post('/api/transactions', (req, res) => {
  try {
    const transaction = blockchain.addTransaction(req.body || {});
    res.status(201).json({
      success: true,
      status: 'pending',
      transaction
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/blocks/mine
 * Finalize pending transactions into a block.
 * Development endpoint; production should be controlled by validators.
 */
app.post('/api/blocks/mine', (req, res) => {
  try {
    const proposer = req.body?.proposer || 'por-validator-1';
    const block = blockchain.minePendingBlock(proposer);
    res.status(201).json({ success: true, block });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// Information Endpoints
// ============================================

/**
 * GET /api/info
 * Get system information
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: 'TMR Blockchain - Proof of Reputation',
    version: '1.0.0',
    algorithm: 'proof-of-reputation',
    environment: NODE_ENV,
    deployment: 'Vercel',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/docs
 * Get API documentation
 */
app.get('/api/docs', (req, res) => {
  const docs = {
    title: 'TMR Blockchain Proof of Reputation API',
    version: '1.0.0',
    baseUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      health: {
        method: 'GET',
        path: '/health',
        description: 'Health check endpoint'
      },
      consensusStatus: {
        method: 'GET',
        path: '/api/consensus/status',
        description: 'Get current consensus status'
      },
      validators: {
        method: 'GET',
        path: '/api/validators',
        description: 'Get list of all validators'
      },
      registerValidator: {
        method: 'POST',
        path: '/api/validators/register',
        description: 'Register a new validator',
        body: {
          validatorId: 'string',
          publicKey: 'string',
          reputation: 'number (optional, default: 500)'
        }
      },
      config: {
        method: 'GET',
        path: '/api/config',
        description: 'Get consensus configuration'
      },
      info: {
        method: 'GET',
        path: '/api/info',
        description: 'Get system information'
      },
      network: {
        method: 'GET',
        path: '/api/network',
        description: 'Get explorer network statistics'
      },
      blocks: {
        method: 'GET',
        path: '/api/blocks',
        description: 'Get latest blocks'
      },
      block: {
        method: 'GET',
        path: '/api/blocks/:height',
        description: 'Get a block by height'
      },
      transaction: {
        method: 'GET',
        path: '/api/transactions/:hash',
        description: 'Get a transaction by hash'
      },
      address: {
        method: 'GET',
        path: '/api/address/:address',
        description: 'Get address balance and recent transactions'
      },
      submitTransaction: {
        method: 'POST',
        path: '/api/transactions',
        description: 'Add a development/test transaction'
      },
      mineBlock: {
        method: 'POST',
        path: '/api/blocks/mine',
        description: 'Finalize pending transactions for development/testing'
      }
    }
  };

  res.json(docs);
});

// ============================================
// Root Endpoint
// ============================================

app.get('/', (req, res) => {
  res.json({
    service: 'TMR Blockchain Proof of Reputation',
    status: 'running',
    algorithm: 'proof-of-reputation',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api/docs`,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Error Handling
// ============================================

/**
 * 404 Handler
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    documentation: '/api/docs'
  });
});

/**
 * Error handler
 */
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Server Startup
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║    TMR Blockchain - Proof of Reputation Consensus API         ║
║                                                                ║
║    Status: ✅ Running                                          ║
║    Port: ${PORT}                                                    ║
║    Environment: ${NODE_ENV}                                         ║
║    Algorithm: Proof of Reputation                              ║
║                                                                ║
║    Endpoints:                                                  ║
║    • Health: http://localhost:${PORT}/health                      ║
║    • API Docs: http://localhost:${PORT}/api/docs                  ║
║    • Consensus: http://localhost:${PORT}/api/consensus/status     ║
║    • Validators: http://localhost:${PORT}/api/validators          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

/**
 * Graceful Shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;

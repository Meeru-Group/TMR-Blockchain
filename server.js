/**
 * TMR Blockchain - Proof of Reputation Consensus Server
 * 
 * Express.js server that hosts the PoR consensus API
 * Serves the consensus network and provides REST endpoints
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
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
    deployment: 'render.com',
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
      }
    }
  };

  res.json(docs);
});

// ============================================
// Explorer / Blockchain Data Endpoints
// ============================================
const block1Hash = 'f26958d42a8adc4a4eae4291febcdf564dc3ad25a2d5efc17f17e5adaccee1c';
const block2Hash = '3a8cd11d20c01fd9805e7c20efd217ae5b296b09020dc4c456b557622bf76913';
const genesisHash = '0000000000000000000000000000000000000000000000000000000000000000';
const explorerBlocks = [
  {height:0,hash:genesisHash,previousHash:null,timestamp:'2026-08-13T00:00:00.000Z',proposer:'genesis',status:'finalized',transactions:[]},
  {height:1,hash:block1Hash,previousHash:genesisHash,timestamp:'2026-08-24T13:00:26.050Z',proposer:'por-validator-001',status:'finalized',transactions:[{hash:'b4178e7b91a22e0986f0ffb8a5ad0d7f264515c90ae62caabca03cfffa25',from:'tmr1genesis',to:'tmr1validator01',amount:250,nonce:0,data:{type:'transfer'}}]},
  {height:2,hash:block2Hash,previousHash:block1Hash,timestamp:'2026-08-24T13:00:26.051Z',proposer:'por-validator-002',status:'finalized',transactions:[{hash:'73d78b14b9da5335f7e1bccd8d151f9e839deb0558c9b0ac7e53760ed07bb',from:'tmr1user01',to:'tmr1user02',amount:100,nonce:0,data:{type:'transfer'}},{hash:'19af2d7f3a9b0f...','from':'tmr1user02','to':'tmr1user03','amount':50,nonce:1,data:{type:'transfer'}}]}
];
app.get('/api/network',(req,res)=>res.json({success:true,latestHeight:2,count:explorerBlocks.length,algorithm:'proof-of-reputation',status:'online',timestamp:new Date().toISOString()}));
app.get('/api/blocks',(req,res)=>res.json({success:true,latestHeight:2,count:explorerBlocks.length,blocks:explorerBlocks.slice().reverse().map(b=>({...b,transactionCount:b.transactions.length,consensus:{algorithm:'proof-of-reputation',status:b.status}}))}));
app.get('/api/blocks/:height',(req,res)=>{const b=explorerBlocks.find(x=>x.height===Number(req.params.height));if(!b)return res.status(404).json({success:false,error:'Block not found'});res.json({...b,transactionCount:b.transactions.length,consensus:{algorithm:'proof-of-reputation',status:b.status}})});
app.get('/api/transactions/:hash',(req,res)=>{const tx=explorerBlocks.flatMap(b=>b.transactions).find(t=>t.hash===req.params.hash);if(!tx)return res.status(404).json({success:false,error:'Transaction not found'});res.json(tx)});
app.get('/api/address/:address',(req,res)=>{const address=req.params.address;const transactions=explorerBlocks.flatMap(b=>b.transactions).filter(t=>t.from===address||t.to===address);res.json({success:true,address,transactions,balance:transactions.reduce((sum,t)=>sum+(t.to===address?Number(t.amount):0)-(t.from===address?Number(t.amount):0),0)})});

// ============================================
// Root Endpoint
// ============================================

app.use(express.static(require('path').join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'public', 'index.html'));
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

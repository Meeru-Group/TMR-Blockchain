/**
 * TMR Blockchain
 * Proof of Reputation Consensus Server
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/* =========================================================
   MOCK PROOF OF REPUTATION CONSENSUS
========================================================= */

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
    const activeValidators =
      this.validators.filter(
        v => v.status === 'active'
      ).length;

    const avgReputation =
      this.validators.length > 0
        ? Math.round(
            this.validators.reduce(
              (sum, v) => sum + v.reputation,
              0
            ) / this.validators.length
          )
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

  registerValidator(
    id,
    publicKey,
    reputation = 500
  ) {
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

/* =========================================================
   INITIALIZE CONSENSUS
========================================================= */

const consensus =
  new MockProofOfReputationConsensus();

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());

app.use(bodyParser.json());

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

/* Request Logger */

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path}`
  );

  next();
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    algorithm: 'proof-of-reputation',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/* =========================================================
   CONSENSUS STATUS
========================================================= */

app.get(
  '/api/consensus/status',
  (req, res) => {
    try {
      const status =
        consensus.getNetworkStatus();

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
  }
);

/* =========================================================
   VALIDATORS
========================================================= */

app.get('/api/validators', (req, res) => {
  try {
    const validators =
      consensus.getAllValidators();

    res.json({
      success: true,

      totalValidators:
        validators.length,

      activeValidators:
        validators.filter(
          v => v.status === 'active'
        ).length,

      validators: validators.map(v => ({
        validatorId:
          v.validatorId,

        reputation:
          v.reputation,

        status:
          v.status,

        blocksProposed:
          v.blocksProposed,

        blocksValidated:
          v.blocksValidated,

        joinedAt:
          new Date(
            v.joinedAt
          ).toISOString()
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/* =========================================================
   REGISTER VALIDATOR
========================================================= */

app.post(
  '/api/validators/register',
  (req, res) => {
    try {
      const {
        validatorId,
        publicKey,
        reputation
      } = req.body;

      if (!validatorId || !publicKey) {
        return res.status(400).json({
          success: false,
          error:
            'validatorId and publicKey are required'
        });
      }

      const validator =
        consensus.registerValidator(
          validatorId,
          publicKey,
          reputation || 500
        );

      res.status(201).json({
        success: true,

        validator: {
          validatorId:
            validator.validatorId,

          reputation:
            validator.reputation,

          status:
            validator.status,

          joinedAt:
            new Date(
              validator.joinedAt
            ).toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   CONFIG
========================================================= */

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

/* =========================================================
   INFO
========================================================= */

app.get('/api/info', (req, res) => {
  res.json({
    name:
      'TMR Blockchain - Proof of Reputation',

    version:
      '1.0.0',

    algorithm:
      'proof-of-reputation',

    environment:
      NODE_ENV,

    deployment:
      'Vercel',

    timestamp:
      new Date().toISOString()
  });
});

/* =========================================================
   API DOCUMENTATION
========================================================= */

app.get('/api/docs', (req, res) => {
  res.json({
    title:
      'TMR Blockchain Proof of Reputation API',

    version:
      '1.0.0',

    baseUrl:
      `${req.protocol}://${req.get('host')}`,

    endpoints: {

      health: {
        method: 'GET',
        path: '/health',
        description:
          'Health check endpoint'
      },

      network: {
        method: 'GET',
        path: '/api/network',
        description:
          'Get blockchain network status'
      },

      blocks: {
        method: 'GET',
        path: '/api/blocks',
        description:
          'Get blockchain blocks'
      },

      block: {
        method: 'GET',
        path: '/api/blocks/:height',
        description:
          'Get block by height'
      },

      transaction: {
        method: 'GET',
        path: '/api/transactions/:hash',
        description:
          'Get complete transaction details'
      },

      address: {
        method: 'GET',
        path: '/api/address/:address',
        description:
          'Get address transactions and balance'
      },

      validators: {
        method: 'GET',
        path: '/api/validators',
        description:
          'Get validators'
      },

      registerValidator: {
        method: 'POST',
        path:
          '/api/validators/register',
        description:
          'Register validator'
      },

      consensusStatus: {
        method: 'GET',
        path:
          '/api/consensus/status',
        description:
          'Get consensus status'
      },

      config: {
        method: 'GET',
        path: '/api/config',
        description:
          'Get consensus configuration'
      },

      info: {
        method: 'GET',
        path: '/api/info',
        description:
          'Get blockchain information'
      }
    }
  });
});

/* =========================================================
   TMR BLOCKCHAIN DATA
========================================================= */

/*
   Genesis Block
*/

const genesisHash =
  '0000000000000000000000000000000000000000000000000000000000000000';

/*
   Block #1
*/

const block1Hash =
  'f26958d42a8adc4a4eae4291febcdf564dc3ad25a2d5efc17f17e5adaccee1c';

/*
   Block #2
*/

const block2Hash =
  '3a8cd11d20c01fd9805e7c20efd217ae5b296b09020dc4c456b557622bf76913';

/* =========================================================
   EXPLORER BLOCKS
========================================================= */

const explorerBlocks = [

  /* =======================================================
     BLOCK 0
  ======================================================= */

  {
    height: 0,

    hash:
      genesisHash,

    previousHash:
      null,

    timestamp:
      '2026-08-13T00:00:00.000Z',

    proposer:
      'genesis',

    status:
      'finalized',

    transactions: []
  },

  /* =======================================================
     BLOCK 1
  ======================================================= */

  {
    height: 1,

    hash:
      block1Hash,

    previousHash:
      genesisHash,

    timestamp:
      '2026-08-24T13:00:26.050Z',

    proposer:
      'por-validator-001',

    status:
      'finalized',

    transactions: [

      {
        hash:
          'b4178e7b91a22e0986f0ffb8a5ad0d7f264515c90ae62caabca03cfffa25',

        from:
          'tmr1genesis',

        to:
          'tmr1validator01',

        amount:
          250,

        nonce:
          0,

        status:
          'finalized',

        data: {
          type:
            'transfer'
        }
      }

    ]
  },

  /* =======================================================
     BLOCK 2
  ======================================================= */

  {
    height: 2,

    hash:
      block2Hash,

    previousHash:
      block1Hash,

    timestamp:
      '2026-08-24T13:00:26.051Z',

    proposer:
      'por-validator-002',

    status:
      'finalized',

    transactions: [

      /* Transaction 1 */

      {
        hash:
          '73d78b14b9da5335f7e1bccd8d151f9e839deb0558c9b0ac7e53760ed07bb',

        from:
          'tmr1user01',

        to:
          'tmr1user02',

        amount:
          100,

        nonce:
          0,

        status:
          'finalized',

        data: {
          type:
            'transfer'
        }
      },

      /* Transaction 2 */

      {
        hash:
          '19af2d7f3a9b0f123456789abcdef123456789abcdef123456789abcdef1234',

        from:
          'tmr1user02',

        to:
          'tmr1user03',

        amount:
          50,

        nonce:
          1,

        status:
          'finalized',

        data: {
          type:
            'transfer'
        }
      }

    ]
  }

];

/* =========================================================
   NETWORK API
========================================================= */

app.get('/api/network', (req, res) => {

  res.json({

    success:
      true,

    latestHeight:
      explorerBlocks.length - 1,

    count:
      explorerBlocks.length,

    algorithm:
      'proof-of-reputation',

    status:
      'online',

    timestamp:
      new Date().toISOString()
  });

});

/* =========================================================
   GET ALL BLOCKS
========================================================= */

app.get('/api/blocks', (req, res) => {

  const blocks =
    explorerBlocks
      .slice()
      .reverse()
      .map(block => ({

        ...block,

        transactionCount:
          block.transactions.length,

        consensus: {

          algorithm:
            'proof-of-reputation',

          status:
            block.status
        }

      }));

  res.json({

    success:
      true,

    latestHeight:
      explorerBlocks.length - 1,

    count:
      explorerBlocks.length,

    blocks
  });

});

/* =========================================================
   GET BLOCK BY HEIGHT
========================================================= */

app.get(
  '/api/blocks/:height',
  (req, res) => {

    const height =
      Number(req.params.height);

    const block =
      explorerBlocks.find(
        b => b.height === height
      );

    if (!block) {

      return res.status(404).json({

        success:
          false,

        error:
          'Block not found'
      });

    }

    res.json({

      ...block,

      transactionCount:
        block.transactions.length,

      consensus: {

        algorithm:
          'proof-of-reputation',

        status:
          block.status
      }

    });

  }
);

/* =========================================================
   GET TRANSACTION BY HASH
========================================================= */

app.get(
  '/api/transactions/:hash',
  (req, res) => {

    try {

      const hash =
        req.params.hash;

      let foundTx =
        null;

      let foundBlock =
        null;

      /*
         Search every block
      */

      for (
        const block
        of explorerBlocks
      ) {

        const transaction =
          block.transactions.find(
            tx =>
              tx.hash === hash
          );

        if (transaction) {

          foundTx =
            transaction;

          foundBlock =
            block;

          break;
        }
      }

      /*
         Transaction not found
      */

      if (!foundTx) {

        return res.status(404).json({

          success:
            false,

          error:
            'Transaction not found'
        });

      }

      /*
         Return COMPLETE transaction
         information.
      */

      res.json({

        success:
          true,

        /* Transaction */

        hash:
          foundTx.hash,

        status:
          foundTx.status ||
          foundBlock.status ||
          'finalized',

        from:
          foundTx.from ||
          '—',

        to:
          foundTx.to ||
          '—',

        amount:
          foundTx.amount ??
          '—',

        nonce:
          foundTx.nonce ??
          0,

        /* Time */

        timestamp:
          foundTx.timestamp ||
          foundBlock.timestamp ||
          null,

        /* Block */

        block:
          foundBlock.height,

        blockHeight:
          foundBlock.height,

        blockHash:
          foundBlock.hash,

        previousHash:
          foundBlock.previousHash,

        /* Validator */

        proposer:
          foundBlock.proposer,

        /* Consensus */

        consensus:
          'Proof-of-Reputation',

        /* Extra */

        transactionData:
          foundTx.data ||
          null

      });

    } catch (error) {

      console.error(
        'Transaction lookup error:',
        error
      );

      res.status(500).json({

        success:
          false,

        error:
          error.message
      });

    }

  }
);

/* =========================================================
   ADDRESS API
========================================================= */

app.get(
  '/api/address/:address',
  (req, res) => {

    const address =
      req.params.address;

    const transactions =
      explorerBlocks
        .flatMap(
          block =>
            block.transactions.map(
              tx => ({

                ...tx,

                block:
                  block.height,

                blockHash:
                  block.hash,

                timestamp:
                  block.timestamp,

                proposer:
                  block.proposer,

                status:
                  block.status
              })
            )
        )
        .filter(
          tx =>
            tx.from === address ||
            tx.to === address
        );

    const balance =
      transactions.reduce(
        (sum, tx) => {

          if (
            tx.to === address
          ) {

            return (
              sum +
              Number(tx.amount)
            );

          }

          if (
            tx.from === address
          ) {

            return (
              sum -
              Number(tx.amount)
            );

          }

          return sum;

        },
        0
      );

    res.json({

      success:
        true,

      address,

      balance,

      transactionCount:
        transactions.length,

      transactions
    });

  }
);

/* =========================================================
   STATIC WEBSITE
========================================================= */

app.use(
  express.static(
    path.join(
      __dirname,
      'public'
    )
  )
);

/* =========================================================
   ROOT
========================================================= */

app.get('/', (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      'public',
      'index.html'
    )
  );

});

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {

    res.status(404).json({

      success:
        false,

      error:
        'Endpoint not found',

      path:
        req.path,

      method:
        req.method,

      documentation:
        '/api/docs'
    });

  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(
      'Server Error:',
      err
    );

    res.status(500).json({

      success:
        false,

      error:
        err.message ||
        'Internal server error',

      timestamp:
        new Date().toISOString()
    });

  }
);

/* =========================================================
   SERVER START
========================================================= */

const server =
  app.listen(
    PORT,
    () => {

      console.log('');
      console.log(
        '=========================================='
      );

      console.log(
        '   TMR Blockchain Explorer'
      );

      console.log(
        '   Proof-of-Reputation'
      );

      console.log(
        '=========================================='
      );

      console.log(
        `Status: Running`
      );

      console.log(
        `Port: ${PORT}`
      );

      console.log(
        `Environment: ${NODE_ENV}`
      );

      console.log(
        `Algorithm: Proof-of-Reputation`
      );

      console.log(
        `Latest Block: ${
          explorerBlocks.length - 1
        }`
      );

      console.log(
        '=========================================='
      );

      console.log('');

    }
  );

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

process.on(
  'SIGTERM',
  () => {

    console.log(
      'SIGTERM received'
    );

    server.close(
      () => {

        console.log(
          'HTTP server closed'
        );

        process.exit(0);

      }
    );

  }
);

process.on(
  'SIGINT',
  () => {

    console.log(
      'SIGINT received'
    );

    server.close(
      () => {

        console.log(
          'HTTP server closed'
        );

        process.exit(0);

      }
    );

  }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = app;

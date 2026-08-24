/**
 * TMR Explorer blockchain data layer.
 *
 * This is an in-memory blockchain used by the deployed API until a real
 * persistent TMR node/RPC is connected. It provides stable explorer-shaped
 * endpoints for blocks, transactions and addresses.
 */

const crypto = require('crypto');

class TMRBlockchain {
  constructor() {
    this.chain = [];
    this.pendingTransactions = [];
    this.transactionIndex = new Map();
    this.createGenesisBlock();
  }

  hashBlock(block) {
    const payload = JSON.stringify({
      height: block.height,
      previousHash: block.previousHash,
      timestamp: block.timestamp,
      proposer: block.proposer,
      transactions: block.transactions
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  hashTransaction(tx) {
    const payload = JSON.stringify({
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      nonce: tx.nonce,
      timestamp: tx.timestamp,
      data: tx.data || null
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  createGenesisBlock() {
    const block = {
      height: 0,
      hash: '0'.repeat(64),
      previousHash: null,
      timestamp: new Date('2026-08-13T00:00:00.000Z').toISOString(),
      proposer: 'genesis',
      transactions: [],
      transactionCount: 0,
      consensus: {
        algorithm: 'proof-of-reputation',
        status: 'finalized'
      }
    };

    this.chain.push(block);
  }

  addTransaction({ from, to, amount, nonce = 0, data = null }) {
    if (!from || !to) throw new Error('from and to are required');
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) {
      throw new Error('amount must be a non-negative number');
    }

    const tx = {
      hash: null,
      from,
      to,
      amount: Number(amount),
      nonce: Number(nonce),
      timestamp: new Date().toISOString(),
      data
    };

    tx.hash = this.hashTransaction(tx);
    this.pendingTransactions.push(tx);
    return tx;
  }

  createBlock(transactions, proposer = 'por-validator-1') {
    const previous = this.chain[this.chain.length - 1];
    const block = {
      height: previous.height + 1,
      hash: null,
      previousHash: previous.hash,
      timestamp: new Date().toISOString(),
      proposer,
      transactions,
      transactionCount: transactions.length,
      consensus: {
        algorithm: 'proof-of-reputation',
        status: 'finalized',
        proposer
      }
    };

    block.hash = this.hashBlock(block);
    this.chain.push(block);

    for (const tx of transactions) {
      this.transactionIndex.set(tx.hash, {
        ...tx,
        blockHeight: block.height,
        blockHash: block.hash,
        status: 'confirmed'
      });
    }

    return block;
  }

  minePendingBlock(proposer = 'por-validator-1') {
    const transactions = this.pendingTransactions.splice(0);
    return this.createBlock(transactions, proposer);
  }

  seedDemoData() {
    if (this.chain.length > 1) return;

    const tx1 = this.addTransaction({
      from: 'tmr1genesis',
      to: 'tmr1validator001',
      amount: 1000,
      nonce: 1,
      data: { type: 'validator-reward' }
    });

    const tx2 = this.addTransaction({
      from: 'tmr1validator001',
      to: 'tmr1user001',
      amount: 250,
      nonce: 1,
      data: { type: 'transfer' }
    });

    this.minePendingBlock('por-validator-1');

    const tx3 = this.addTransaction({
      from: 'tmr1user001',
      to: 'tmr1user002',
      amount: 50,
      nonce: 1,
      data: { type: 'transfer' }
    });

    const tx4 = this.addTransaction({
      from: 'tmr1validator002',
      to: 'tmr1user003',
      amount: 500,
      nonce: 1,
      data: { type: 'validator-reward' }
    });

    this.minePendingBlock('por-validator-2');

    // Keep references visible for debugging and explorer tests.
    this.demoTransactionHashes = [tx1.hash, tx2.hash, tx3.hash, tx4.hash];
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  getBlocks(limit = 20) {
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    return this.chain.slice(-safeLimit).reverse();
  }

  getBlock(height) {
    const numericHeight = Number(height);
    if (!Number.isInteger(numericHeight) || numericHeight < 0) return null;
    return this.chain.find(block => block.height === numericHeight) || null;
  }

  getTransaction(hash) {
    return this.transactionIndex.get(hash) || null;
  }

  getAddress(address) {
    const transactions = [];
    let balance = 0;

    for (const tx of this.transactionIndex.values()) {
      if (tx.from === address) {
        balance -= tx.amount;
        transactions.push(tx);
      }
      if (tx.to === address) {
        balance += tx.amount;
        transactions.push(tx);
      }
    }

    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      address,
      balance,
      transactionCount: transactions.length,
      transactions: transactions.slice(0, 50)
    };
  }

  getNetworkStats() {
    const latest = this.getLatestBlock();
    const transactionCount = Array.from(this.transactionIndex.values()).length;

    return {
      chain: 'TMR Blockchain',
      algorithm: 'proof-of-reputation',
      height: latest.height,
      latestBlockHash: latest.hash,
      totalBlocks: this.chain.length,
      totalTransactions: transactionCount,
      pendingTransactions: this.pendingTransactions.length,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = TMRBlockchain;

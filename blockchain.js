// ============================================================
// TMR BLOCKCHAIN - PERSISTENT CHAIN DATA LAYER
// PostgreSQL + Proof-of-Reputation
// Vercel compatible block production
// ============================================================

const crypto = require("crypto");
const db = require("./database");

const BLOCK_TIME_MS = Math.max(
  Number(process.env.TMR_BLOCK_TIME_MS || 12000),
  5000
);

class TMRBlockchain {

  // ----------------------------------------------------------
  // INITIALIZE
  // ----------------------------------------------------------

  async initialize() {
    await db.initializeDatabase();
  }

  // ----------------------------------------------------------
  // TRANSACTION HASH
  // ----------------------------------------------------------

  hashTransaction(tx) {
    return crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          from: tx.from,
          to: tx.to,
          amount: tx.amount,
          nonce: tx.nonce,
          timestamp: tx.timestamp,
          data: tx.data || null
        })
      )
      .digest("hex");
  }

  // ----------------------------------------------------------
  // BLOCK HASH
  // ----------------------------------------------------------

  hashBlock(block) {
    return crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          height: block.height,
          previousHash: block.previousHash,
          timestamp: block.timestamp,
          proposer: block.proposer,
          transactions: block.transactions
        })
      )
      .digest("hex");
  }

  // ----------------------------------------------------------
  // LATEST BLOCK
  // ----------------------------------------------------------

  async getLatestBlock() {
    const result = await db.query(`
      SELECT
        height,
        hash,
        previous_hash AS "previousHash",
        timestamp,
        proposer,
        validator,
        transactions,
        transaction_count AS "transactionCount",
        consensus,
        status
      FROM blocks
      ORDER BY height DESC
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  // ----------------------------------------------------------
  // BLOCK LIST
  // ----------------------------------------------------------

  async getBlocks(limit = 20) {

    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const result = await db.query(
      `
      SELECT
        height,
        hash,
        previous_hash AS "previousHash",
        timestamp,
        proposer,
        validator,
        transactions,
        transaction_count AS "transactionCount",
        consensus,
        status
      FROM blocks
      ORDER BY height DESC
      LIMIT $1
      `,
      [safeLimit]
    );

    return result.rows;
  }

  // ----------------------------------------------------------
  // GET BLOCK
  // ----------------------------------------------------------

  async getBlock(heightOrHash) {

    let result;

    if (/^\d+$/.test(String(heightOrHash))) {

      result = await db.query(
        `
        SELECT
          height,
          hash,
          previous_hash AS "previousHash",
          timestamp,
          proposer,
          validator,
          transactions,
          transaction_count AS "transactionCount",
          consensus,
          status
        FROM blocks
        WHERE height = $1
        LIMIT 1
        `,
        [Number(heightOrHash)]
      );

    } else {

      result = await db.query(
        `
        SELECT
          height,
          hash,
          previous_hash AS "previousHash",
          timestamp,
          proposer,
          validator,
          transactions,
          transaction_count AS "transactionCount",
          consensus,
          status
        FROM blocks
        WHERE hash = $1
        LIMIT 1
        `,
        [heightOrHash]
      );

    }

    return result.rows[0] || null;
  }

  // ----------------------------------------------------------
  // GET TRANSACTION
  // ----------------------------------------------------------

  async getTransaction(hash) {

    const result = await db.query(
      `
      SELECT
        hash,
        from_address AS "from",
        to_address AS "to",
        amount::text AS amount,
        nonce,
        timestamp,
        data,
        block_height AS "blockHeight",
        block_hash AS "blockHash",
        status
      FROM transactions
      WHERE hash = $1
      LIMIT 1
      `,
      [hash]
    );

    return result.rows[0] || null;
  }

  // ----------------------------------------------------------
  // GET TRANSACTIONS
  // ----------------------------------------------------------

  async getTransactions(limit = 50) {

    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const result = await db.query(
      `
      SELECT
        hash,
        from_address AS "from",
        to_address AS "to",
        amount::text AS amount,
        nonce,
        timestamp,
        data,
        block_height AS "blockHeight",
        block_hash AS "blockHash",
        status
      FROM transactions
      ORDER BY timestamp DESC
      LIMIT $1
      `,
      [safeLimit]
    );

    return result.rows;
  }

  // ----------------------------------------------------------
  // ADDRESS
  // ----------------------------------------------------------

  async getAddress(address) {

    const result = await db.query(
      `
      SELECT
        hash,
        from_address AS "from",
        to_address AS "to",
        amount::text AS amount,
        nonce,
        timestamp,
        data,
        block_height AS "blockHeight",
        block_hash AS "blockHash",
        status
      FROM transactions
      WHERE from_address = $1
         OR to_address = $1
      ORDER BY timestamp DESC
      LIMIT 50
      `,
      [address]
    );

    let balance = 0;

    for (const tx of result.rows) {

      const amount = Number(tx.amount);

      if (tx.to === address) {
        balance += amount;
      }

      if (tx.from === address) {
        balance -= amount;
      }
    }

    return {
      address,
      balance,
      transactionCount: result.rows.length,
      transactions: result.rows
    };
  }

  // ----------------------------------------------------------
  // NETWORK STATS
  // ----------------------------------------------------------

  async getNetworkStats() {

    const [
      latest,
      blockCount,
      txCount,
      pending
    ] = await Promise.all([

      this.getLatestBlock(),

      db.query(
        "SELECT COUNT(*)::int AS count FROM blocks"
      ),

      db.query(
        "SELECT COUNT(*)::int AS count FROM transactions"
      ),

      db.query(
        `
        SELECT COUNT(*)::int AS count
        FROM transactions
        WHERE status = 'pending'
        `
      )
    ]);

    return {

      chain: "TMR Blockchain",

      algorithm: "proof-of-reputation",

      height:
        latest
          ? Number(latest.height)
          : 0,

      latestBlockHash:
        latest
          ? latest.hash
          : null,

      totalBlocks:
        blockCount.rows[0].count,

      totalTransactions:
        txCount.rows[0].count,

      pendingTransactions:
        pending.rows[0].count,

      timestamp:
        new Date().toISOString()
    };
  }

  // ----------------------------------------------------------
  // ADD TRANSACTION
  // ----------------------------------------------------------

  async addTransaction({
    from,
    to,
    amount,
    nonce = 0,
    data = null
  }) {

    if (!from || !to) {
      throw new Error(
        "from and to are required"
      );
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      throw new Error(
        "amount must be a non-negative number"
      );
    }

    const timestamp =
      new Date().toISOString();

    const tx = {

      from,

      to,

      amount: numericAmount,

      nonce: Number(nonce),

      timestamp,

      data
    };

    const hash =
      this.hashTransaction(tx);

    await db.query(
      `
      INSERT INTO transactions
      (
        hash,
        from_address,
        to_address,
        amount,
        nonce,
        timestamp,
        data,
        status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7::jsonb,
        'pending'
      )
      ON CONFLICT (hash)
      DO NOTHING
      `,
      [
        hash,
        from,
        to,
        numericAmount,
        Number(nonce),
        timestamp,
        JSON.stringify(data)
      ]
    );

    return {

      hash,

      ...tx,

      status: "pending"
    };
  }

  // ----------------------------------------------------------
  // CREATE BLOCK MANUALLY
  // ----------------------------------------------------------

  async createBlock(
    transactionHashes = [],
    proposer = "por-validator-001"
  ) {

    return db.withTransaction(
      async (client) => {

        // Prevent duplicate block height.
        await client.query(
          "SELECT pg_advisory_xact_lock($1)",
          [872341]
        );

        const latestResult =
          await client.query(`
            SELECT
              height,
              hash
            FROM blocks
            ORDER BY height DESC
            LIMIT 1
          `);

        const previous =
          latestResult.rows[0] || {
            height: 0,
            hash: "0".repeat(64)
          };

        let txResult;

        if (transactionHashes.length) {

          txResult =
            await client.query(
              `
              SELECT
                hash,
                from_address AS "from",
                to_address AS "to",
                amount::text AS amount,
                nonce,
                timestamp,
                data
              FROM transactions
              WHERE hash = ANY($1::text[])
                AND status = 'pending'
              ORDER BY timestamp ASC
              `,
              [transactionHashes]
            );

        } else {

          txResult =
            await client.query(`
              SELECT
                hash,
                from_address AS "from",
                to_address AS "to",
                amount::text AS amount,
                nonce,
                timestamp,
                data
              FROM transactions
              WHERE status = 'pending'
              ORDER BY timestamp ASC
              LIMIT 100
            `);
        }

        const transactions =
          txResult.rows;

        const height =
          Number(previous.height) + 1;

        const timestamp =
          new Date().toISOString();

        const blockForHash = {

          height,

          previousHash:
            previous.hash,

          timestamp,

          proposer,

          transactions
        };

        const hash =
          this.hashBlock(
            blockForHash
          );

        const block = {

          ...blockForHash,

          hash,

          validator:
            proposer,

          transactionCount:
            transactions.length,

          consensus: {

            algorithm:
              "proof-of-reputation",

            status:
              "finalized",

            proposer
          },

          status:
            "finalized"
        };

        await client.query(
          `
          INSERT INTO blocks
          (
            height,
            hash,
            previous_hash,
            timestamp,
            proposer,
            validator,
            transactions,
            transaction_count,
            consensus,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7::jsonb,
            $8,
            $9::jsonb,
            $10
          )
          `,
          [
            height,
            hash,
            previous.hash,
            timestamp,
            proposer,
            proposer,
            JSON.stringify(
              transactions
            ),
            transactions.length,
            JSON.stringify(
              block.consensus
            ),
            "finalized"
          ]
        );

        for (
          const tx of transactions
        ) {

          await client.query(
            `
            UPDATE transactions
            SET
              block_height = $1,
              block_hash = $2,
              status = 'confirmed'
            WHERE hash = $3
            `,
            [
              height,
              hash,
              tx.hash
            ]
          );
        }

        await client.query(
          `
          UPDATE validators
          SET
            blocks_proposed =
              blocks_proposed + 1,

            blocks_validated =
              blocks_validated + 1,

            last_active =
              NOW()

          WHERE validator_id = $1
          `,
          [proposer]
        );

        return block;
      }
    );
  }

  // ----------------------------------------------------------
  // AUTOMATIC BLOCK PRODUCTION
  // ----------------------------------------------------------

  async produceNextBlockIfDue() {

    return db.withTransaction(
      async (client) => {

        /*
         * Vercel does not keep a permanent
         * Node.js process alive.
         *
         * Therefore every API request can
         * trigger this function.
         */

        await client.query(
          "SELECT pg_advisory_xact_lock($1)",
          [872342]
        );

        // Get latest block.
        const latestResult =
          await client.query(`
            SELECT
              height,
              hash,
              timestamp
            FROM blocks
            ORDER BY height DESC
            LIMIT 1
          `);

        const latest =
          latestResult.rows[0];

        if (!latest) {
          return null;
        }

        const lastTimestamp =
          new Date(
            latest.timestamp
          ).getTime();

        const now =
          Date.now();

        // Wait until block interval.
        if (
          Number.isFinite(
            lastTimestamp
          ) &&
          now - lastTimestamp <
            BLOCK_TIME_MS
        ) {
          return null;
        }

        const height =
          Number(latest.height) + 1;

        // Active validators.
        const validatorsResult =
          await client.query(`
            SELECT
              validator_id,
              reputation,
              reputation_score
            FROM validators
            WHERE status = 'active'
            ORDER BY
              reputation DESC,
              validator_id ASC
          `);

        if (
          !validatorsResult.rows.length
        ) {
          return null;
        }

        // Rotate proposer.
        const proposer =
          validatorsResult.rows[
            (height - 1) %
            validatorsResult.rows.length
          ].validator_id;

        // Pending transactions.
        const txResult =
          await client.query(`
            SELECT
              hash,
              from_address AS "from",
              to_address AS "to",
              amount::text AS amount,
              nonce,
              timestamp,
              data
            FROM transactions
            WHERE status = 'pending'
            ORDER BY timestamp ASC
            LIMIT 100
          `);

        const transactions =
          txResult.rows;

        const timestamp =
          new Date().toISOString();

        const blockForHash = {

          height,

          previousHash:
            latest.hash,

          timestamp,

          proposer,

          transactions
        };

        const hash =
          this.hashBlock(
            blockForHash
          );

        const block = {

          ...blockForHash,

          hash,

          validator:
            proposer,

          transactionCount:
            transactions.length,

          consensus: {

            algorithm:
              "proof-of-reputation",

            status:
              "finalized",

            proposer,

            approvalThreshold:
              0.66
          },

          status:
            "finalized"
        };

        // Save block.
        await client.query(
          `
          INSERT INTO blocks
          (
            height,
            hash,
            previous_hash,
            timestamp,
            proposer,
            validator,
            transactions,
            transaction_count,
            consensus,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7::jsonb,
            $8,
            $9::jsonb,
            $10
          )
          `,
          [
            height,
            hash,
            latest.hash,
            timestamp,
            proposer,
            proposer,
            JSON.stringify(
              transactions
            ),
            transactions.length,
            JSON.stringify(
              block.consensus
            ),
            "finalized"
          ]
        );

        // Confirm transactions.
        for (
          const tx of transactions
        ) {

          await client.query(
            `
            UPDATE transactions
            SET
              block_height = $1,
              block_hash = $2,
              status = 'confirmed'
            WHERE hash = $3
              AND status = 'pending'
            `,
            [
              height,
              hash,
              tx.hash
            ]
          );
        }

        // Reward validator.
        await client.query(
          `
          UPDATE validators
          SET
            blocks_proposed =
              blocks_proposed + 1,

            blocks_validated =
              blocks_validated + 1,

            reputation =
              LEAST(
                1000,
                reputation + 2
              ),

            reputation_score =
              LEAST(
                1000,
                reputation_score + 2
              ),

            last_active =
              NOW()

          WHERE validator_id = $1
          `,
          [proposer]
        );

        // Record reputation event.
        await client.query(
          `
          INSERT INTO reputation_events
          (
            validator_id,
            event_type,
            amount,
            reason,
            block_height
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            proposer,
            "valid_block_proposal",
            2,
            "Finalized block proposal",
            height
          ]
        );

        return block;
      }
    );
  }
}

module.exports = TMRBlockchain;

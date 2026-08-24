// ============================================================
// TMR BLOCKCHAIN - PostgreSQL DATABASE
// Persistent storage for blocks, transactions, validators and state
// ============================================================

const { Pool } = require("pg");

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Add a PostgreSQL connection string to your Vercel Environment Variables."
    );
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
  }

  return pool;
}

async function query(text, params = []) {
  const result = await getPool().query(text, params);
  return result;
}

async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS chain_meta (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS blocks (
      height BIGINT PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      previous_hash TEXT,
      timestamp TIMESTAMPTZ NOT NULL,
      proposer TEXT NOT NULL,
      validator TEXT,
      transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
      transaction_count INTEGER NOT NULL DEFAULT 0,
      consensus JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'finalized',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS blocks_hash_idx
      ON blocks(hash);

    CREATE INDEX IF NOT EXISTS blocks_timestamp_idx
      ON blocks(timestamp DESC);

    CREATE TABLE IF NOT EXISTS transactions (
      hash TEXT PRIMARY KEY,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount NUMERIC(78, 0) NOT NULL,
      nonce BIGINT NOT NULL DEFAULT 0,
      timestamp TIMESTAMPTZ NOT NULL,
      data JSONB,
      block_height BIGINT REFERENCES blocks(height),
      block_hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS transactions_block_idx
      ON transactions(block_height);

    CREATE INDEX IF NOT EXISTS transactions_from_idx
      ON transactions(from_address);

    CREATE INDEX IF NOT EXISTS transactions_to_idx
      ON transactions(to_address);

    CREATE TABLE IF NOT EXISTS validators (
      validator_id TEXT PRIMARY KEY,
      public_key TEXT NOT NULL UNIQUE,
      reputation INTEGER NOT NULL DEFAULT 500,
      reputation_score INTEGER NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'active',
      blocks_proposed BIGINT NOT NULL DEFAULT 0,
      blocks_validated BIGINT NOT NULL DEFAULT 0,
      missed_rounds BIGINT NOT NULL DEFAULT 0,
      invalid_blocks BIGINT NOT NULL DEFAULT 0,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS validators_reputation_idx
      ON validators(reputation DESC);

    CREATE TABLE IF NOT EXISTS reputation_events (
      id BIGSERIAL PRIMARY KEY,
      validator_id TEXT NOT NULL REFERENCES validators(validator_id),
      event_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      block_height BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS reputation_events_validator_idx
      ON reputation_events(validator_id, created_at DESC);
  `);

  await seedGenesis();
  await seedInitialValidators();
}

async function seedGenesis() {
  const result = await query(
    "SELECT height FROM blocks WHERE height = 0 LIMIT 1"
  );
  if (result.rowCount > 0) return;

  await query(
    `INSERT INTO blocks
      (height, hash, previous_hash, timestamp, proposer, validator,
       transactions, transaction_count, consensus, status)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb,$10)`,
    [
      0,
      "0".repeat(64),
      null,
      "2026-08-13T00:00:00.000Z",
      "genesis",
      "genesis",
      JSON.stringify([]),
      0,
      JSON.stringify({
        algorithm: "proof-of-reputation",
        status: "finalized"
      }),
      "finalized"
    ]
  );
}

async function seedInitialValidators() {
  const validators = [
    ["por-validator-001", "tmr-public-key-001", 850],
    ["por-validator-002", "tmr-public-key-002", 900],
    ["por-validator-003", "tmr-public-key-003", 750]
  ];

  for (const [id, publicKey, reputation] of validators) {
    await query(
      `INSERT INTO validators
        (validator_id, public_key, reputation, reputation_score)
       VALUES ($1,$2,$3,$3)
       ON CONFLICT (validator_id) DO NOTHING`,
      [id, publicKey, reputation]
    );
  }
}

module.exports = {
  getPool,
  query,
  withTransaction,
  initializeDatabase
};

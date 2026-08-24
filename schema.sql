-- ============================================================
-- TMR BLOCKCHAIN - POSTGRESQL SCHEMA
-- Run once if your deployment user cannot create tables.
-- server.js also creates these tables automatically.
-- ============================================================

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

CREATE TABLE IF NOT EXISTS transactions (
  hash TEXT PRIMARY KEY,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount NUMERIC(78,0) NOT NULL,
  nonce BIGINT NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB,
  block_height BIGINT REFERENCES blocks(height),
  block_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS reputation_events (
  id BIGSERIAL PRIMARY KEY,
  validator_id TEXT NOT NULL REFERENCES validators(validator_id),
  event_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  block_height BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

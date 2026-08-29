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
  validator TEXT NOT NULL,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  consensus JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'finalized',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blocks_hash_idx ON blocks(hash);
CREATE INDEX IF NOT EXISTS blocks_timestamp_idx ON blocks(timestamp DESC);

CREATE TABLE IF NOT EXISTS transactions (
  hash TEXT PRIMARY KEY,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount NUMERIC(78,0) NOT NULL,
  nonce BIGINT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  data JSONB,
  block_height BIGINT REFERENCES blocks(height),
  block_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tx_block_idx ON transactions(block_height);
CREATE INDEX IF NOT EXISTS tx_from_idx ON transactions(from_address);
CREATE INDEX IF NOT EXISTS tx_to_idx ON transactions(to_address);

CREATE TABLE IF NOT EXISTS validators (
  validator_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL UNIQUE,
  reputation INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'active',
  blocks_proposed BIGINT NOT NULL DEFAULT 0,
  blocks_validated BIGINT NOT NULL DEFAULT 0,
  missed_rounds BIGINT NOT NULL DEFAULT 0,
  invalid_blocks BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS node_peers (
  peer_id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_seen TIMESTAMPTZ
);
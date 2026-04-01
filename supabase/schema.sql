-- Amplai token usage tracking table
-- Run this in Supabase SQL Editor after creating the project

CREATE TABLE IF NOT EXISTS token_usage (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd REAL NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  scenario_id TEXT,
  optimization_level INTEGER DEFAULT 0,
  session_id TEXT,
  cached BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_token_usage_model ON token_usage(model);
CREATE INDEX IF NOT EXISTS idx_token_usage_scenario ON token_usage(scenario_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_level ON token_usage(optimization_level);
CREATE INDEX IF NOT EXISTS idx_token_usage_created ON token_usage(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anonymous users (dev mode)
-- Tighten this for production
CREATE POLICY "Allow all for development" ON token_usage
  FOR ALL USING (true) WITH CHECK (true);

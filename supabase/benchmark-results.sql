CREATE TABLE IF NOT EXISTS benchmark_results (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scenario_id TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  model_id TEXT NOT NULL,
  optimization_level INTEGER DEFAULT 0,
  total_input_tokens INTEGER NOT NULL,
  total_output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  total_cost_usd REAL NOT NULL,
  avg_latency_ms INTEGER NOT NULL,
  turns_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bench_scenario ON benchmark_results(scenario_id);
CREATE INDEX IF NOT EXISTS idx_bench_model ON benchmark_results(model_id);
CREATE INDEX IF NOT EXISTS idx_bench_level ON benchmark_results(optimization_level);

ALTER TABLE benchmark_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all benchmark" ON benchmark_results
  FOR ALL USING (true) WITH CHECK (true);

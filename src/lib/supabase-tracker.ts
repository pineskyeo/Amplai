// Supabase token usage persistence
// Stores every LLM call to Supabase for dashboards and analysis

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key)
  }

  return supabaseInstance
}

export interface TokenUsageRecord {
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  latency_ms: number
  scenario_id?: string
  optimization_level?: number
  session_id?: string
  cached: boolean
}

export async function saveTokenUsage(record: TokenUsageRecord): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return

  const { error } = await supabase.from('token_usage').insert({
    ...record,
    created_at: new Date().toISOString(),
  })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] Failed to save token usage:', error.message)
  }
}

export async function getTokenUsageStats(filters?: {
  scenarioId?: string
  optimizationLevel?: number
  modelId?: string
  since?: string
}) {
  const supabase = getSupabase()
  if (!supabase) return null

  let query = supabase.from('token_usage').select('*')

  if (filters?.scenarioId) {
    query = query.eq('scenario_id', filters.scenarioId)
  }
  if (filters?.optimizationLevel !== undefined) {
    query = query.eq('optimization_level', filters.optimizationLevel)
  }
  if (filters?.modelId) {
    query = query.eq('model', filters.modelId)
  }
  if (filters?.since) {
    query = query.gte('created_at', filters.since)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    // eslint-disable-next-line no-console
    console.error('[Supabase] Failed to fetch token usage:', error.message)
    return null
  }

  return data
}

export async function getBenchmarkComparison() {
  const supabase = getSupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('token_usage')
    .select(
      'scenario_id, optimization_level, model, input_tokens, output_tokens, cost_usd, latency_ms'
    )
    .not('scenario_id', 'is', null)
    .order('optimization_level', { ascending: true })

  if (error) return null

  // Group by scenario + optimization level
  const grouped: Record<
    string,
    Record<
      number,
      {
        totalInput: number
        totalOutput: number
        totalCost: number
        avgLatency: number
        count: number
      }
    >
  > = {}

  for (const row of data) {
    const key = row.scenario_id as string
    const level = row.optimization_level as number

    if (!grouped[key]) grouped[key] = {}
    if (!grouped[key][level]) {
      grouped[key][level] = {
        totalInput: 0,
        totalOutput: 0,
        totalCost: 0,
        avgLatency: 0,
        count: 0,
      }
    }

    const g = grouped[key][level]
    g.totalInput += row.input_tokens
    g.totalOutput += row.output_tokens
    g.totalCost += row.cost_usd
    g.avgLatency = (g.avgLatency * g.count + row.latency_ms) / (g.count + 1)
    g.count += 1
  }

  return grouped
}

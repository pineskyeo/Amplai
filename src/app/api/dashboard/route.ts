import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const { data: rows, error } = await supabase
    .from('token_usage')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  // --- Aggregate stats ---
  const totalInput = rows.reduce((s, r) => s + r.input_tokens, 0)
  const totalOutput = rows.reduce((s, r) => s + r.output_tokens, 0)
  const totalCost = rows.reduce((s, r) => s + r.cost_usd, 0)
  const avgLatency =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.latency_ms, 0) / rows.length)
      : 0

  // --- Model breakdown ---
  const modelMap: Record<
    string,
    {
      input: number
      output: number
      cost: number
      count: number
      avgLatency: number
    }
  > = {}
  for (const r of rows) {
    if (!modelMap[r.model]) {
      modelMap[r.model] = {
        input: 0,
        output: 0,
        cost: 0,
        count: 0,
        avgLatency: 0,
      }
    }
    const m = modelMap[r.model]
    m.input += r.input_tokens
    m.output += r.output_tokens
    m.cost += r.cost_usd
    m.avgLatency = (m.avgLatency * m.count + r.latency_ms) / (m.count + 1)
    m.count += 1
  }

  // --- Token usage over time (group by hour) ---
  const timeMap: Record<
    string,
    { input: number; output: number; cost: number; count: number }
  > = {}
  for (const r of rows) {
    const hour = r.created_at.substring(0, 13) + ':00' // YYYY-MM-DDTHH:00
    if (!timeMap[hour]) {
      timeMap[hour] = { input: 0, output: 0, cost: 0, count: 0 }
    }
    timeMap[hour].input += r.input_tokens
    timeMap[hour].output += r.output_tokens
    timeMap[hour].cost += r.cost_usd
    timeMap[hour].count += 1
  }
  const timeline = Object.entries(timeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, data]) => ({ time: time.substring(5, 16), ...data }))

  // --- Cumulative cost ---
  let cumCost = 0
  const cumulativeCost = rows.map((r) => {
    cumCost += r.cost_usd
    return {
      time: r.created_at.substring(5, 16),
      cost: Number(cumCost.toFixed(4)),
    }
  })

  // --- Input tokens growth per turn ---
  const tokenGrowth = rows.map((r, i) => ({
    turn: i + 1,
    input: r.input_tokens,
    output: r.output_tokens,
    total: r.input_tokens + r.output_tokens,
  }))

  // --- Optimization level comparison ---
  const levelMap: Record<
    number,
    {
      input: number
      output: number
      cost: number
      latency: number
      count: number
    }
  > = {}
  for (const r of rows) {
    const level = r.optimization_level ?? 0
    if (!levelMap[level]) {
      levelMap[level] = { input: 0, output: 0, cost: 0, latency: 0, count: 0 }
    }
    const l = levelMap[level]
    l.input += r.input_tokens
    l.output += r.output_tokens
    l.cost += r.cost_usd
    l.latency += r.latency_ms
    l.count += 1
  }

  return Response.json({
    summary: {
      totalRequests: rows.length,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      totalCostUsd: Number(totalCost.toFixed(4)),
      avgLatencyMs: avgLatency,
    },
    modelBreakdown: Object.entries(modelMap).map(([model, data]) => ({
      model,
      ...data,
      cost: Number(data.cost.toFixed(4)),
      avgLatency: Math.round(data.avgLatency),
    })),
    timeline,
    cumulativeCost,
    tokenGrowth,
    optimizationLevels: Object.entries(levelMap).map(([level, data]) => ({
      level: Number(level),
      ...data,
      cost: Number(data.cost.toFixed(4)),
      avgLatency: Math.round(data.latency / data.count),
    })),
  })
}

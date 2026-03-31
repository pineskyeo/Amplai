// Token usage tracking — per request and per conversation
// Stores in-memory for now, can be persisted to DB later

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  model: string
  costUsd: number
  latencyMs: number
  timestamp: number
  cached: boolean
}

export interface ConversationStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  turnCount: number
  avgTokensPerTurn: number
  usageByModel: Record<
    string,
    { input: number; output: number; cost: number; count: number }
  >
}

// Model pricing per 1M tokens (input / output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-flash': { input: 0.075, output: 0.3 },
  'gemini-pro': { input: 1.25, output: 10.0 },
  deepseek: { input: 0.27, output: 1.1 },
  haiku: { input: 0.8, output: 4.0 },
  'openrouter-free': { input: 0, output: 0 },
  sonnet: { input: 3.0, output: 15.0 },
}

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING['gemini-flash']
  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  )
}

// In-memory store (per server instance)
const usageLog: TokenUsage[] = []

export function trackUsage(usage: TokenUsage): void {
  usageLog.push(usage)
}

export function getUsageLog(): TokenUsage[] {
  return usageLog
}

export function getConversationStats(): ConversationStats {
  const stats: ConversationStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    turnCount: usageLog.length,
    avgTokensPerTurn: 0,
    usageByModel: {},
  }

  for (const usage of usageLog) {
    stats.totalInputTokens += usage.inputTokens
    stats.totalOutputTokens += usage.outputTokens
    stats.totalCostUsd += usage.costUsd

    if (!stats.usageByModel[usage.model]) {
      stats.usageByModel[usage.model] = {
        input: 0,
        output: 0,
        cost: 0,
        count: 0,
      }
    }
    stats.usageByModel[usage.model].input += usage.inputTokens
    stats.usageByModel[usage.model].output += usage.outputTokens
    stats.usageByModel[usage.model].cost += usage.costUsd
    stats.usageByModel[usage.model].count += 1
  }

  if (stats.turnCount > 0) {
    stats.avgTokensPerTurn =
      (stats.totalInputTokens + stats.totalOutputTokens) / stats.turnCount
  }

  return stats
}

export function clearUsageLog(): void {
  usageLog.length = 0
}

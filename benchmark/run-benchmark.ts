/* eslint-disable no-console */
// Benchmark runner — executes test scenarios against the chat API
// Usage: pnpm benchmark
// Usage: pnpm benchmark -- --scenario short-3turn --model deepseek --level 0

import { config } from 'dotenv'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

config({ path: '.env.local' })

interface Scenario {
  id: string
  name: string
  description: string
  messages: Array<{ role: string; content: string }>
}

interface TurnResult {
  turn: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  responseLength: number
}

interface BenchmarkResult {
  scenarioId: string
  scenarioName: string
  model: string
  optimizationLevel: number
  timestamp: string
  turns: TurnResult[]
  totals: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    avgLatencyMs: number
    totalLatencyMs: number
  }
}

const API_BASE = process.env.BENCHMARK_API_URL ?? 'http://localhost:3000'

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  const parsed: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    parsed[args[i].replace(/^--/, '')] = args[i + 1]
  }
  return {
    scenario: parsed.scenario, // specific scenario ID, or 'all'
    model: parsed.model ?? 'deepseek',
    level: parseInt(parsed.level ?? '0', 10),
  }
}

// Load scenarios
function loadScenarios(scenarioId?: string): Scenario[] {
  const scenariosDir = join(import.meta.dirname, 'scenarios')
  const files = readdirSync(scenariosDir).filter((f) => f.endsWith('.json'))

  const scenarios: Scenario[] = files.map((f) => {
    const content = readFileSync(join(scenariosDir, f), 'utf-8')
    return JSON.parse(content) as Scenario
  })

  if (scenarioId && scenarioId !== 'all') {
    return scenarios.filter((s) => s.id === scenarioId)
  }

  return scenarios
}

// Run a single scenario
async function runScenario(
  scenario: Scenario,
  model: string,
  optimizationLevel: number
): Promise<BenchmarkResult> {
  console.log(`\n▶ Running: ${scenario.name} (${scenario.id})`)
  console.log(`  Model: ${model} | Optimization Level: ${optimizationLevel}`)

  const turns: TurnResult[] = []
  const conversationMessages: Array<{
    id: string
    role: string
    parts: Array<{ type: string; text: string }>
  }> = []

  for (let i = 0; i < scenario.messages.length; i++) {
    const userMsg = scenario.messages[i]

    // Add user message to conversation
    conversationMessages.push({
      id: `msg-${i * 2}`,
      role: userMsg.role,
      parts: [{ type: 'text', text: userMsg.content }],
    })

    const startTime = Date.now()

    // Call chat API
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationMessages,
        modelId: model,
        scenarioId: scenario.id,
        optimizationLevel,
      }),
    })

    // Read streaming response
    const text = await res.text()
    const latencyMs = Date.now() - startTime

    // Extract assistant response from stream
    const assistantText = extractTextFromStream(text)

    // Add assistant response to conversation
    conversationMessages.push({
      id: `msg-${i * 2 + 1}`,
      role: 'assistant',
      parts: [{ type: 'text', text: assistantText }],
    })

    // Get token stats from stats API
    const statsRes = await fetch(`${API_BASE}/api/chat/stats`)
    const statsData = (await statsRes.json()) as {
      recentUsage: Array<{
        inputTokens: number
        outputTokens: number
        costUsd: number
        latencyMs: number
      }>
    }

    const lastUsage = statsData.recentUsage[statsData.recentUsage.length - 1]

    const turnResult: TurnResult = {
      turn: i + 1,
      inputTokens: lastUsage?.inputTokens ?? 0,
      outputTokens: lastUsage?.outputTokens ?? 0,
      costUsd: lastUsage?.costUsd ?? 0,
      latencyMs: lastUsage?.latencyMs ?? latencyMs,
      responseLength: assistantText.length,
    }

    turns.push(turnResult)
    console.log(
      `  Turn ${i + 1}/${scenario.messages.length}: ${turnResult.inputTokens}+${turnResult.outputTokens} tokens | $${turnResult.costUsd.toFixed(4)} | ${turnResult.latencyMs}ms`
    )

    // Small delay between turns
    await sleep(500)
  }

  const totals = {
    inputTokens: turns.reduce((s, t) => s + t.inputTokens, 0),
    outputTokens: turns.reduce((s, t) => s + t.outputTokens, 0),
    totalTokens: turns.reduce((s, t) => s + t.inputTokens + t.outputTokens, 0),
    costUsd: turns.reduce((s, t) => s + t.costUsd, 0),
    avgLatencyMs: Math.round(
      turns.reduce((s, t) => s + t.latencyMs, 0) / turns.length
    ),
    totalLatencyMs: turns.reduce((s, t) => s + t.latencyMs, 0),
  }

  console.log(
    `\n  ✓ Total: ${totals.totalTokens} tokens | $${totals.costUsd.toFixed(4)} | avg ${totals.avgLatencyMs}ms`
  )

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    model,
    optimizationLevel,
    timestamp: new Date().toISOString(),
    turns,
    totals,
  }
}

function extractTextFromStream(streamText: string): string {
  const lines = streamText.split('\n')
  const textParts: string[] = []

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === 'text-delta') {
          textParts.push(data.delta)
        }
      } catch {
        // skip non-JSON lines
      }
    }
  }

  return textParts.join('')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Main
async function main() {
  const { scenario, model, level } = parseArgs()

  console.log('═══════════════════════════════════════')
  console.log('  Amplai Benchmark Runner')
  console.log('═══════════════════════════════════════')
  console.log(`Model: ${model}`)
  console.log(`Optimization Level: ${level}`)

  const scenarios = loadScenarios(scenario)
  console.log(`Scenarios: ${scenarios.length}`)

  const results: BenchmarkResult[] = []

  for (const s of scenarios) {
    const result = await runScenario(s, model, level)
    results.push(result)
  }

  // Save results
  const filename = `level-${level}-${model}-${Date.now()}.json`
  const resultsPath = join(import.meta.dirname, 'results', filename)
  writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`\n✓ Results saved to: ${resultsPath}`)

  // Print summary
  console.log('\n═══════════════════════════════════════')
  console.log('  Summary')
  console.log('═══════════════════════════════════════')

  for (const r of results) {
    console.log(`\n${r.scenarioName}:`)
    console.log(
      `  Tokens: ${r.totals.totalTokens.toLocaleString()} (in: ${r.totals.inputTokens.toLocaleString()} / out: ${r.totals.outputTokens.toLocaleString()})`
    )
    console.log(`  Cost:   $${r.totals.costUsd.toFixed(4)}`)
    console.log(`  Avg Latency: ${r.totals.avgLatencyMs}ms`)
  }
}

main().catch((err: unknown) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})

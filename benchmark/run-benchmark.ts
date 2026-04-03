/* eslint-disable no-console */
// Benchmark runner — executes test scenarios against the chat API
//
// Usage:
//   pnpm benchmark                                          # show help
//   pnpm benchmark -- --scenario short-3turn --model deepseek
//   pnpm benchmark -- --scenario all --model deepseek,haiku
//   pnpm benchmark -- --model deepseek,haiku,sonnet --level 0
//   pnpm benchmark -- --list                                # list scenarios & models
//   pnpm benchmark -- --compare                             # compare saved results

import { config } from 'dotenv'
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
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

const AVAILABLE_MODELS = [
  'deepseek',
  'haiku',
  'sonnet',
  'gemini-flash',
  'openrouter-free',
]

// --- CLI ---

function parseArgs() {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  const parsed: Record<string, string> = {}
  const flags: string[] = []

  for (let i = 0; i < args.length; i++) {
    if (
      args[i].startsWith('--') &&
      args[i + 1] &&
      !args[i + 1].startsWith('--')
    ) {
      parsed[args[i].replace(/^--/, '')] = args[i + 1]
      i++
    } else if (args[i].startsWith('--')) {
      flags.push(args[i].replace(/^--/, ''))
    }
  }

  return {
    scenario: parsed.scenario,
    models: parsed.model?.split(',') ?? ['deepseek'],
    level: parseInt(parsed.level ?? '0', 10),
    list: flags.includes('list'),
    compare: flags.includes('compare'),
    help: flags.includes('help') || args.length === 0,
  }
}

function showHelp() {
  console.log(`
Amplai Benchmark Runner
═══════════════════════════════════════

Usage:
  pnpm benchmark -- [options]

Options:
  --scenario <id|all>     시나리오 선택 (기본: all)
  --model <id,id,...>     모델 선택, 쉼표 구분 (기본: deepseek)
  --level <n>             최적화 레벨 (기본: 0)
  --list                  시나리오/모델 목록 보기
  --compare               저장된 결과 비교
  --help                  도움말

Examples:
  pnpm benchmark -- --scenario short-3turn --model deepseek
  pnpm benchmark -- --scenario all --model deepseek,haiku
  pnpm benchmark -- --model deepseek,haiku,sonnet --level 0
  pnpm benchmark -- --compare

Available Models: ${AVAILABLE_MODELS.join(', ')}
`)
}

function showList() {
  const scenarios = loadScenarios()

  console.log('\n시나리오:')
  for (const s of scenarios) {
    console.log(`  ${s.id.padEnd(20)} ${s.name} (${s.messages.length}턴)`)
    console.log(`  ${''.padEnd(20)} ${s.description}`)
  }

  console.log('\n모델:')
  for (const m of AVAILABLE_MODELS) {
    console.log(`  ${m}`)
  }

  console.log('\n저장된 결과:')
  const resultsDir = join(import.meta.dirname, 'results')
  if (existsSync(resultsDir)) {
    const files = readdirSync(resultsDir).filter((f) => f.endsWith('.json'))
    for (const f of files) {
      console.log(`  ${f}`)
    }
    if (files.length === 0) console.log('  (없음)')
  }
}

// --- Scenarios ---

function loadScenarios(scenarioId?: string): Scenario[] {
  const scenariosDir = join(import.meta.dirname, 'scenarios')
  const files = readdirSync(scenariosDir).filter((f) => f.endsWith('.json'))

  const scenarios: Scenario[] = files.map((f) => {
    const content = readFileSync(join(scenariosDir, f), 'utf-8')
    return JSON.parse(content) as Scenario
  })

  if (scenarioId && scenarioId !== 'all') {
    const filtered = scenarios.filter((s) => s.id === scenarioId)
    if (filtered.length === 0) {
      console.error(`시나리오 "${scenarioId}" 를 찾을 수 없습니다.`)
      console.log('사용 가능:', scenarios.map((s) => s.id).join(', '))
      process.exit(1)
    }
    return filtered
  }

  return scenarios
}

// --- Run ---

async function runScenario(
  scenario: Scenario,
  model: string,
  optimizationLevel: number
): Promise<BenchmarkResult> {
  console.log(`\n▶ ${scenario.name} (${scenario.id}) × ${model}`)

  const turns: TurnResult[] = []
  const conversationMessages: Array<{
    id: string
    role: string
    parts: Array<{ type: string; text: string }>
  }> = []
  const conversationId = `bench_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  for (let i = 0; i < scenario.messages.length; i++) {
    const userMsg = scenario.messages[i]

    conversationMessages.push({
      id: `msg-${i * 2}`,
      role: userMsg.role,
      parts: [{ type: 'text', text: userMsg.content }],
    })

    const startTime = Date.now()

    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationMessages,
        modelId: model,
        conversationId,
        scenarioId: scenario.id,
        optimizationLevel,
      }),
    })

    const text = await res.text()
    const latencyMs = Date.now() - startTime
    const assistantText = extractTextFromStream(text)

    conversationMessages.push({
      id: `msg-${i * 2 + 1}`,
      role: 'assistant',
      parts: [{ type: 'text', text: assistantText }],
    })

    // Get stats
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

    const bar = '█'.repeat(
      Math.min(Math.floor(turnResult.inputTokens / 100), 30)
    )
    console.log(
      `  ${String(i + 1).padStart(2)}/${scenario.messages.length} │ ${bar} ${turnResult.inputTokens}+${turnResult.outputTokens}tok │ $${turnResult.costUsd.toFixed(4)} │ ${turnResult.latencyMs}ms`
    )

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
    `  ✓ Total: ${totals.totalTokens.toLocaleString()} tokens │ $${totals.costUsd.toFixed(4)} │ avg ${totals.avgLatencyMs}ms`
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

// --- Compare ---

function compareResults() {
  const resultsDir = join(import.meta.dirname, 'results')
  if (!existsSync(resultsDir)) {
    console.log('결과 파일이 없습니다.')
    return
  }

  const files = readdirSync(resultsDir).filter((f) => f.endsWith('.json'))
  if (files.length === 0) {
    console.log('결과 파일이 없습니다. 먼저 벤치마크를 실행하세요.')
    return
  }

  const allResults: BenchmarkResult[] = []
  for (const f of files) {
    const content = readFileSync(join(resultsDir, f), 'utf-8')
    const results = JSON.parse(content) as BenchmarkResult[]
    allResults.push(...results)
  }

  // Group by scenario
  const byScenario: Record<string, BenchmarkResult[]> = {}
  for (const r of allResults) {
    if (!byScenario[r.scenarioId]) byScenario[r.scenarioId] = []
    byScenario[r.scenarioId].push(r)
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  Benchmark Comparison')
  console.log('═══════════════════════════════════════')

  for (const [scenarioId, results] of Object.entries(byScenario)) {
    console.log(`\n📋 ${results[0].scenarioName} (${scenarioId})`)
    console.log('  ┌──────────────┬────────┬──────────┬──────────┬──────────┐')
    console.log('  │ Model        │ Level  │ Tokens   │ Cost     │ Latency  │')
    console.log('  ├──────────────┼────────┼──────────┼──────────┼──────────┤')

    const sorted = results.sort((a, b) => {
      if (a.optimizationLevel !== b.optimizationLevel)
        return a.optimizationLevel - b.optimizationLevel
      return a.model.localeCompare(b.model)
    })

    const baseline = sorted[0]?.totals

    for (const r of sorted) {
      const tokenDelta = baseline
        ? ` (${((r.totals.totalTokens / baseline.totalTokens - 1) * 100).toFixed(0)}%)`
        : ''

      console.log(
        `  │ ${r.model.padEnd(12)} │ L${String(r.optimizationLevel).padEnd(5)} │ ${String(r.totals.totalTokens).padStart(6)}${tokenDelta.padStart(7)} │ $${r.totals.costUsd.toFixed(4).padStart(7)} │ ${String(r.totals.avgLatencyMs).padStart(6)}ms │`
      )
    }
    console.log('  └──────────────┴────────┴──────────┴──────────┴──────────┘')
  }
}

// --- Utils ---

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
        // skip
      }
    }
  }

  return textParts.join('')
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// --- Main ---

async function main() {
  const { scenario, models, level, list, compare, help } = parseArgs()

  if (help) {
    showHelp()
    return
  }

  if (list) {
    showList()
    return
  }

  if (compare) {
    compareResults()
    return
  }

  // Validate models
  for (const m of models) {
    if (!AVAILABLE_MODELS.includes(m)) {
      console.error(`모델 "${m}" 을 찾을 수 없습니다.`)
      console.log('사용 가능:', AVAILABLE_MODELS.join(', '))
      process.exit(1)
    }
  }

  console.log('═══════════════════════════════════════')
  console.log('  Amplai Benchmark Runner')
  console.log('═══════════════════════════════════════')
  console.log(`Models: ${models.join(', ')}`)
  console.log(`Optimization Level: ${level}`)

  const scenarios = loadScenarios(scenario)
  console.log(`Scenarios: ${scenarios.map((s) => s.id).join(', ')}`)
  console.log(
    `Total runs: ${scenarios.length} scenarios × ${models.length} models = ${scenarios.length * models.length}`
  )

  const allResults: BenchmarkResult[] = []

  for (const model of models) {
    for (const s of scenarios) {
      const result = await runScenario(s, model, level)
      allResults.push(result)
    }
  }

  // Save results
  const modelStr = models.join('+')
  const filename = `level-${level}-${modelStr}-${Date.now()}.json`
  const resultsPath = join(import.meta.dirname, 'results', filename)
  writeFileSync(resultsPath, JSON.stringify(allResults, null, 2))
  console.log(`\n✓ Results saved: ${filename}`)

  // Print summary table
  console.log('\n═══════════════════════════════════════')
  console.log('  Summary')
  console.log('═══════════════════════════════════════')
  console.log(
    `\n  ${'Scenario'.padEnd(25)} ${'Model'.padEnd(14)} ${'Tokens'.padStart(8)} ${'Cost'.padStart(9)} ${'Latency'.padStart(9)}`
  )
  console.log('  ' + '─'.repeat(67))

  for (const r of allResults) {
    console.log(
      `  ${r.scenarioName.padEnd(25)} ${r.model.padEnd(14)} ${String(r.totals.totalTokens).padStart(8)} $${r.totals.costUsd.toFixed(4).padStart(8)} ${String(r.totals.avgLatencyMs).padStart(7)}ms`
    )
  }
}

main().catch((err: unknown) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})

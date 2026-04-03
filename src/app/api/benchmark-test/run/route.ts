import { streamText, convertToModelMessages, type UIMessage } from 'ai'

import { getChatModel } from '@/lib/ai-model'
import { calculateCost } from '@/lib/token-tracker'
import { saveTokenUsage } from '@/lib/supabase-tracker'
import {
  setBenchmarkRunning,
  updateBenchmarkProgress,
  setBenchmarkDone,
  addBenchmarkResult,
  type BenchmarkRunResult,
} from '@/lib/benchmark-status'

const SYSTEM_PROMPT = `당신은 Amplai의 AI 엔지니어 컨설턴트입니다. 한국어로 대화합니다. 기술 용어는 영어를 유지합니다.`

interface RunRequest {
  scenarios: Array<{
    id: string
    name: string
    messages: Array<{ role: string; content: string }>
  }>
  models: string[]
  optimizationLevel: number
}

export async function POST(req: Request) {
  const { scenarios, models, optimizationLevel } =
    (await req.json()) as RunRequest

  const totalRuns = scenarios.length * models.length
  setBenchmarkRunning(totalRuns, '', '')

  // Run in background — don't await
  void runAllBenchmarks(scenarios, models, optimizationLevel, totalRuns)

  return Response.json({ started: true, totalRuns })
}

async function runAllBenchmarks(
  scenarios: RunRequest['scenarios'],
  models: string[],
  optimizationLevel: number,
  totalRuns: number
) {
  let completed = 0

  for (const model of models) {
    for (const scenario of scenarios) {
      completed++
      updateBenchmarkProgress(completed, totalRuns, scenario.name, model)

      try {
        const result = await runSingleScenario(
          scenario,
          model,
          optimizationLevel
        )
        addBenchmarkResult(result)
      } catch {
        // Continue with next
      }
    }
  }

  setBenchmarkDone()
}

async function runSingleScenario(
  scenario: RunRequest['scenarios'][number],
  modelId: string,
  optimizationLevel: number
): Promise<BenchmarkRunResult> {
  const turns: BenchmarkRunResult['turns'] = []
  const conversationMessages: UIMessage[] = []

  for (let i = 0; i < scenario.messages.length; i++) {
    const userMsg = scenario.messages[i]

    conversationMessages.push({
      id: `msg-${i * 2}`,
      role: userMsg.role as 'user',
      parts: [{ type: 'text' as const, text: userMsg.content }],
    })

    const startTime = Date.now()

    const result = await streamText({
      model: getChatModel(modelId),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(conversationMessages),
    })

    let assistantText = ''
    for await (const chunk of result.textStream) {
      assistantText += chunk
    }

    const latencyMs = Date.now() - startTime
    const usage = await result.usage
    const inputTokens = usage?.inputTokens ?? 0
    const outputTokens = usage?.outputTokens ?? 0
    const costUsd = calculateCost(modelId, inputTokens, outputTokens)

    void saveTokenUsage({
      model: modelId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      latency_ms: latencyMs,
      scenario_id: scenario.id,
      optimization_level: optimizationLevel,
      cached: false,
    })

    conversationMessages.push({
      id: `msg-${i * 2 + 1}`,
      role: 'assistant',
      parts: [{ type: 'text' as const, text: assistantText }],
    })

    turns.push({
      turn: i + 1,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      responsePreview: assistantText.substring(0, 100),
    })
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    modelId,
    optimizationLevel,
    timestamp: new Date().toISOString(),
    turns,
    totals: {
      inputTokens: turns.reduce((s, t) => s + t.inputTokens, 0),
      outputTokens: turns.reduce((s, t) => s + t.outputTokens, 0),
      totalTokens: turns.reduce(
        (s, t) => s + t.inputTokens + t.outputTokens,
        0
      ),
      costUsd: turns.reduce((s, t) => s + t.costUsd, 0),
      avgLatencyMs: Math.round(
        turns.reduce((s, t) => s + t.latencyMs, 0) / turns.length
      ),
    },
  }
}

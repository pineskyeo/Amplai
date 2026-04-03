import { streamText, convertToModelMessages, type UIMessage } from 'ai'

import { getChatModel } from '@/lib/ai-model'
import { trackUsage, calculateCost } from '@/lib/token-tracker'
import { saveTokenUsage } from '@/lib/supabase-tracker'
import {
  setBenchmarkRunning,
  updateBenchmarkProgress,
  setBenchmarkDone,
} from '@/lib/benchmark-status'

const SYSTEM_PROMPT = `당신은 Amplai의 AI 엔지니어 컨설턴트입니다. 한국어로 대화합니다. 기술 용어는 영어를 유지합니다.`

interface BenchmarkTestRequest {
  scenarioId: string
  modelId: string
  optimizationLevel: number
  messages: Array<{ role: string; content: string }>
}

interface TurnResult {
  turn: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  responsePreview: string
}

export async function POST(req: Request) {
  const { scenarioId, modelId, optimizationLevel, messages } =
    (await req.json()) as BenchmarkTestRequest

  const results: TurnResult[] = []
  const conversationMessages: UIMessage[] = []

  setBenchmarkRunning(messages.length, scenarioId, modelId)

  for (let i = 0; i < messages.length; i++) {
    updateBenchmarkProgress(i, scenarioId, modelId)
    const userMsg = messages[i]

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

    // Track
    trackUsage({
      inputTokens,
      outputTokens,
      model: modelId,
      costUsd,
      latencyMs,
      timestamp: Date.now(),
      cached: false,
    })

    void saveTokenUsage({
      model: modelId,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      latency_ms: latencyMs,
      scenario_id: scenarioId,
      optimization_level: optimizationLevel,
      cached: false,
    })

    conversationMessages.push({
      id: `msg-${i * 2 + 1}`,
      role: 'assistant',
      parts: [{ type: 'text' as const, text: assistantText }],
    })

    results.push({
      turn: i + 1,
      inputTokens,
      outputTokens,
      costUsd,
      latencyMs,
      responsePreview: assistantText.substring(0, 100),
    })
  }

  setBenchmarkDone()

  const totals = {
    inputTokens: results.reduce((s, r) => s + r.inputTokens, 0),
    outputTokens: results.reduce((s, r) => s + r.outputTokens, 0),
    totalTokens: results.reduce(
      (s, r) => s + r.inputTokens + r.outputTokens,
      0
    ),
    costUsd: results.reduce((s, r) => s + r.costUsd, 0),
    avgLatencyMs: Math.round(
      results.reduce((s, r) => s + r.latencyMs, 0) / results.length
    ),
  }

  return Response.json({
    scenarioId,
    modelId,
    optimizationLevel,
    timestamp: new Date().toISOString(),
    turns: results,
    totals,
  })
}

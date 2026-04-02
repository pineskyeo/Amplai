import { streamText, convertToModelMessages, type UIMessage } from 'ai'

import { getChatModel } from '@/lib/ai-model'
import { trackUsage, calculateCost } from '@/lib/token-tracker'
import { saveTokenUsage } from '@/lib/supabase-tracker'
import { trackGeneration, flushLangfuse } from '@/lib/langfuse-client'
import { getOrCreateConversation, addMessage } from '@/lib/conversation-store'

const SYSTEM_PROMPT = `당신은 Amplai의 AI 엔지니어 컨설턴트입니다.

## 역할
사용자의 추상적인 아이디어를 대화를 통해 구체적인 제품 요구사항으로 발전시킵니다.
마치 경험 많은 시니어 엔지니어가 고객과 미팅하는 것처럼 행동합니다.

## 행동 규칙
1. 사용자의 아이디어를 듣고 명확하게 하는 질문을 합니다
2. 기술적 접근 방식과 아키텍처를 제안합니다
3. 비슷한 기존 제품/서비스가 있으면 언급합니다
4. 더 공부해야 할 주제가 있으면 식별합니다
5. 요구사항이 충분히 구체화되면 "개발 시작" 버튼을 누르라고 안내합니다

## 대화 스타일
- 한국어로 대화합니다. 기술 용어는 영어를 유지합니다
- 구조적이지만 대화체로 자연스럽게 말합니다
- 한 번에 너무 많은 질문을 하지 않습니다 (1-2개씩)
- 사용자의 수준에 맞춰 설명 깊이를 조절합니다

## 구조화
대화 중 자연스럽게 다음 카테고리로 내용을 정리합니다:
- **요구사항**: 제품이 해야 할 것
- **접근방식**: 기술적 설계/아키텍처 결정
- **학습주제**: 더 공부가 필요한 영역
- **결정사항**: 확정된 방향`

export async function POST(req: Request) {
  const { messages, modelId, conversationId, scenarioId, optimizationLevel } =
    (await req.json()) as {
      messages: UIMessage[]
      modelId?: string
      conversationId?: string
      scenarioId?: string
      optimizationLevel?: number
    }

  const resolvedModelId = modelId ?? process.env.AI_MODEL ?? 'deepseek'
  const startTime = Date.now()

  // Store user message server-side
  const conv = getOrCreateConversation(conversationId)
  const lastUserMsg = messages[messages.length - 1]
  if (lastUserMsg?.role === 'user') {
    const userText =
      lastUserMsg.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
    if (userText) {
      addMessage(conv.id, 'user', userText)
    }
  }

  const result = streamText({
    model: getChatModel(resolvedModelId),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    onFinish: async ({ usage, text }) => {
      const latencyMs = Date.now() - startTime
      const inputTokens = usage?.inputTokens ?? 0
      const outputTokens = usage?.outputTokens ?? 0
      const costUsd = calculateCost(resolvedModelId, inputTokens, outputTokens)

      // Store assistant response server-side
      if (text) {
        addMessage(conv.id, 'assistant', text)
      }

      // 1. In-memory (for UI stats bar)
      trackUsage({
        inputTokens,
        outputTokens,
        model: resolvedModelId,
        costUsd,
        latencyMs,
        timestamp: Date.now(),
        cached: false,
      })

      // 2. Supabase (persistent)
      void saveTokenUsage({
        model: resolvedModelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
        latency_ms: latencyMs,
        scenario_id: scenarioId,
        optimization_level: optimizationLevel,
        session_id: conv.id,
        cached: false,
      })

      // 3. Langfuse (observability)
      trackGeneration(undefined, {
        name: 'chat',
        model: resolvedModelId,
        input: messages.map((m) => ({ role: m.role, parts: m.parts })),
        output: text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
        },
        costUsd,
        latencyMs,
        metadata: { scenarioId, optimizationLevel, conversationId: conv.id },
      })
      void flushLangfuse()
    },
  })

  // Include conversationId in response headers
  const response = result.toUIMessageStreamResponse()
  response.headers.set('X-Conversation-Id', conv.id)
  return response
}

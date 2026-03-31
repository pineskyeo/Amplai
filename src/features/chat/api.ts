import { generateObject } from 'ai'
import { z } from 'zod'

import { getChatModel } from '@/lib/ai-model'
import type { ConversationTopicModel } from '@/types'

const TopicSchema = z.object({
  topics: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      category: z.enum(['requirement', 'approach', 'study-topic', 'decision']),
    })
  ),
})

export async function extractTopicsFromMessages(
  messages: Array<{ role: string; content: string }>,
  modelId?: string
): Promise<ConversationTopicModel[]> {
  try {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const { object } = await generateObject({
      model: getChatModel(modelId),
      schema: TopicSchema,
      prompt: `다음 대화에서 핵심 토픽을 추출해주세요. 각 토픽을 카테고리로 분류합니다:
- requirement: 제품이 해야 할 것
- approach: 기술적 접근/설계 결정
- study-topic: 더 공부가 필요한 주제
- decision: 확정된 결정 사항

대화:
${conversation}`,
    })

    return object.topics
  } catch {
    return []
  }
}

export async function generateRequirementSummary(
  messages: Array<{ role: string; content: string }>,
  modelId?: string
): Promise<string> {
  try {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const { object } = await generateObject({
      model: getChatModel(modelId),
      schema: z.object({ requirement: z.string() }),
      prompt: `다음 대화에서 제품 요구사항을 한 문단으로 요약해주세요. 코드 생성을 위한 프롬프트로 사용됩니다.

대화:
${conversation}`,
    })

    return object.requirement
  } catch {
    return ''
  }
}

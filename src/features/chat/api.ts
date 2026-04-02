import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'

import type { ConversationTopicModel } from '@/types'

// Use Haiku for structured extraction — reliable + cheap
function getExtractionModel() {
  return anthropic('claude-haiku-4-5-20251001')
}

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
  messages: Array<{ role: string; content: string }>
): Promise<ConversationTopicModel[]> {
  try {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const { object } = await generateObject({
      model: getExtractionModel(),
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
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[extract-topics] Failed:', err)
    return []
  }
}

export async function generateRequirementSummary(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  try {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
      .join('\n\n')

    const { object } = await generateObject({
      model: getExtractionModel(),
      schema: z.object({ requirement: z.string() }),
      prompt: `다음 대화에서 제품 요구사항을 한 문단으로 요약해주세요. 코드 생성을 위한 프롬프트로 사용됩니다.

대화:
${conversation}`,
    })

    return object.requirement
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[extract-requirement] Failed:', err)
    return ''
  }
}

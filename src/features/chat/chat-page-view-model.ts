import type { ConversationTopicModel, TopicCategory } from '@/types'

export interface ChatPageViewModel {
  hasMessages: boolean
  canStartDevelopment: boolean
  topicsByCategory: Record<TopicCategory, ConversationTopicModel[]>
  topicCounts: Record<TopicCategory, number>
  totalTopics: number
}

const EMPTY_CATEGORIES: Record<TopicCategory, ConversationTopicModel[]> = {
  requirement: [],
  approach: [],
  'study-topic': [],
  decision: [],
}

export function createChatPageViewModel(
  messageCount: number,
  topics: ConversationTopicModel[]
): ChatPageViewModel {
  const topicsByCategory = { ...EMPTY_CATEGORIES }

  for (const topic of topics) {
    topicsByCategory[topic.category] = [
      ...topicsByCategory[topic.category],
      topic,
    ]
  }

  const topicCounts: Record<TopicCategory, number> = {
    requirement: topicsByCategory.requirement.length,
    approach: topicsByCategory.approach.length,
    'study-topic': topicsByCategory['study-topic'].length,
    decision: topicsByCategory.decision.length,
  }

  return {
    hasMessages: messageCount > 0,
    canStartDevelopment: topicsByCategory.requirement.length > 0,
    topicsByCategory,
    topicCounts,
    totalTopics: topics.length,
  }
}

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  requirement: '요구사항',
  approach: '접근방식',
  'study-topic': '학습주제',
  decision: '결정사항',
}

export const CATEGORY_COLORS: Record<TopicCategory, string> = {
  requirement: 'bg-blue-100 text-blue-700',
  approach: 'bg-green-100 text-green-700',
  'study-topic': 'bg-amber-100 text-amber-700',
  decision: 'bg-purple-100 text-purple-700',
}

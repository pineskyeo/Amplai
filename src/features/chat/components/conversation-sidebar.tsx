'use client'

import { cn } from '@/lib/utils'
import type { TopicCategory } from '@/types'
import type { ChatPageViewModel } from '../chat-page-view-model'
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../chat-page-view-model'

interface Props {
  viewModel: ChatPageViewModel
  isExtracting: boolean
  onExtractTopics: () => void
  onStartDevelopment: () => void
}

const CATEGORY_ORDER: TopicCategory[] = [
  'requirement',
  'approach',
  'study-topic',
  'decision',
]

export default function ConversationSidebar({
  viewModel,
  isExtracting,
  onExtractTopics,
  onStartDevelopment,
}: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900">대화 토픽</h2>
        <p className="mt-1 text-xs text-gray-500">
          {viewModel.totalTopics > 0
            ? `${viewModel.totalTopics}개 토픽 추출됨`
            : '대화를 시작하면 토픽이 자동 추출됩니다'}
        </p>
      </div>

      {/* Topics */}
      <div className="flex-1 overflow-y-auto p-4">
        {CATEGORY_ORDER.map((category) => {
          const categoryTopics = viewModel.topicsByCategory[category]
          if (categoryTopics.length === 0) return null

          return (
            <div key={category} className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-medium',
                    CATEGORY_COLORS[category]
                  )}
                >
                  {CATEGORY_LABELS[category]}
                </span>
                <span className="text-[10px] text-gray-400">
                  {categoryTopics.length}
                </span>
              </div>
              <div className="space-y-2">
                {categoryTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-2.5"
                  >
                    <p className="text-xs font-medium text-gray-900">
                      {topic.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                      {topic.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {viewModel.totalTopics === 0 && viewModel.hasMessages && (
          <button
            onClick={onExtractTopics}
            disabled={isExtracting}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            {isExtracting ? '추출 중...' : '토픽 추출하기'}
          </button>
        )}
      </div>

      {/* Start Development */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onStartDevelopment}
          disabled={!viewModel.hasMessages}
          className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          개발 시작
        </button>
        <p className="mt-2 text-center text-[10px] text-gray-400">
          대화 내용을 기반으로 벤치마크를 실행합니다
        </p>
      </div>
    </div>
  )
}

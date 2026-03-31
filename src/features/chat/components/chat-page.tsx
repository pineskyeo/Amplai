'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { MODEL_OPTIONS } from '@/lib/ai-model'
import Logo from '@/components/ui/logo'
import { useChatPagePresenter } from '../chat-page-presenter'
import MessageBubble from './message-bubble'
import ChatInput from './chat-input'
import ConversationSidebar from './conversation-sidebar'
import TokenStatsBar from './token-stats-bar'

export default function ChatPage() {
  const {
    messages,
    input,
    setInput,
    handleSend,
    isLoading,
    isExtracting,
    sidebarOpen,
    setSidebarOpen,
    extractTopics,
    handleStartDevelopment,
    viewModel,
    selectedModel,
    setSelectedModel,
  } = useChatPagePresenter()

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <span className="hidden text-xs text-gray-400 md:inline">
            AI Engineer Consultant
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-gray-400 focus:outline-none"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.cost})
              </option>
            ))}
          </select>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 md:hidden"
          >
            토픽 {viewModel.totalTopics > 0 && `(${viewModel.totalTopics})`}
          </button>
          <Link
            href="/benchmark"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            Benchmark
          </Link>
        </div>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Chat area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900">
                    무엇을 만들고 싶으세요?
                  </h1>
                  <p className="mt-2 text-sm text-gray-500">
                    아이디어를 말해보세요. 함께 구체화해 나갑니다.
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-gray-100 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.1s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Token stats */}
          <TokenStatsBar />

          {/* Input */}
          <div className="mx-auto w-full max-w-2xl">
            <ChatInput
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSend={handleSend}
            />
          </div>
        </div>

        {/* Sidebar — desktop always, mobile overlay */}
        <div
          className={cn(
            'w-72 shrink-0 border-l border-gray-200 bg-white',
            'hidden md:block',
            sidebarOpen &&
              'fixed inset-y-0 right-0 z-50 block shadow-xl md:relative md:shadow-none'
          )}
        >
          <ConversationSidebar
            viewModel={viewModel}
            isExtracting={isExtracting}
            onExtractTopics={extractTopics}
            onStartDevelopment={handleStartDevelopment}
          />
        </div>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  '모든 사람이 AI Native가 되는 걸 도와주는 제품을 만들고 싶어',
  '음식 배달 앱을 만들고 싶어',
  '팀 프로젝트 관리 도구를 만들고 싶어',
]

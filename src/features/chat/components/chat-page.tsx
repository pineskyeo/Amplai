'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import { MODEL_OPTIONS } from '@/lib/ai-model'
import Logo from '@/components/ui/logo'
import { useChatPagePresenter } from '../chat-page-presenter'
import MessageBubble from './message-bubble'
import ChatInput from './chat-input'
import ConversationSidebar from './conversation-sidebar'
import Conversations from './conversations'
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
    handleNewConversation,
    switchConversation,
    viewModel,
    selectedModel,
    setSelectedModel,
    conversationId,
  } = useChatPagePresenter()

  const [convListOpen, setConvListOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex h-screen max-w-[100vw] flex-col overflow-x-hidden bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-2 py-2 md:px-6 md:py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Logo size="md" />
          <span className="hidden text-xs text-gray-400 lg:inline">
            AI Engineer Consultant
          </span>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-20 rounded-lg border border-gray-200 bg-white px-1 py-1.5 text-[10px] text-gray-600 focus:border-gray-400 focus:outline-none md:w-auto md:px-2 md:text-xs"
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.cost})
              </option>
            ))}
          </select>
          {/* Mobile: conversation list toggle */}
          <button
            onClick={() => setConvListOpen(!convListOpen)}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 md:hidden"
            title="대화 목록"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 3h12M2 7h8M2 11h10M14 9l-2 2-2-2" />
            </svg>
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 md:hidden"
            title="토픽"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M2 4h12M2 8h8M2 12h10" />
            </svg>
          </button>
          <Link
            href="/benchmark"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 md:px-3 md:py-1.5 md:text-xs md:text-gray-600"
            title="Benchmark"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="md:hidden"
            >
              <path d="M3 13V7M7 13V3M11 13V9M15 13V5" />
            </svg>
            <span className="hidden md:inline">Benchmark</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 md:px-3 md:py-1.5 md:text-xs md:text-gray-600"
            title="Dashboard"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="md:hidden"
            >
              <path d="M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z" />
            </svg>
            <span className="hidden md:inline">Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar — conversation list */}
        <div className="hidden md:flex">
          <Conversations
            currentId={conversationId}
            onSelect={switchConversation}
            onNewConversation={handleNewConversation}
          />
        </div>

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

        {/* Right sidebar — topics */}
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

        {/* Mobile overlay — topics */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile overlay — conversation list */}
        {convListOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20 md:hidden"
              onClick={() => setConvListOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-64 shadow-xl md:hidden">
              <Conversations
                currentId={conversationId}
                onSelect={(id) => {
                  switchConversation(id)
                  setConvListOpen(false)
                }}
                onNewConversation={() => {
                  handleNewConversation()
                  setConvListOpen(false)
                }}
              />
            </div>
          </>
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

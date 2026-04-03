'use client'

import { useState, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'

interface ConversationItem {
  id: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface Props {
  currentId: string
  onSelect: (id: string) => void
  onNewConversation: () => void
}

// External store for conversations polling
let cachedConvs: ConversationItem[] | null = null
let convListeners: Array<() => void> = []
let convPolling = false

function subscribeConvs(listener: () => void) {
  convListeners.push(listener)
  if (!convPolling) {
    convPolling = true
    const poll = () => {
      fetch('/api/chat/conversations')
        .then((r) => r.json())
        .then((data: { conversations: ConversationItem[] }) => {
          cachedConvs = data.conversations
          for (const l of convListeners) l()
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => {
      convListeners = convListeners.filter((l) => l !== listener)
      if (convListeners.length === 0) {
        clearInterval(id)
        convPolling = false
      }
    }
  }
  return () => {
    convListeners = convListeners.filter((l) => l !== listener)
    if (convListeners.length === 0) convPolling = false
  }
}

function getConvsSnapshot() {
  return cachedConvs
}

export default function Conversations({
  currentId,
  onSelect,
  onNewConversation,
}: Props) {
  const conversations = useSyncExternalStore(
    subscribeConvs,
    getConvsSnapshot,
    () => null
  )
  const [collapsed, setCollapsed] = useState(false)

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}분 전`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}시간 전`
    const days = Math.floor(hours / 24)
    return `${days}일 전`
  }

  if (collapsed) {
    return (
      <div className="flex w-10 shrink-0 flex-col items-center border-r border-gray-200 bg-gray-50 py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
          title="대화 목록 열기"
        >
          ▶
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
        <span className="text-xs font-semibold text-gray-700">대화 목록</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ◀
        </button>
      </div>

      <div className="border-b border-gray-100 px-3 py-2">
        <button
          onClick={onNewConversation}
          className="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + 새 대화
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!conversations || conversations.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-gray-400">
            대화가 없습니다
          </p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full border-b border-gray-100 px-3 py-2.5 text-left transition-colors hover:bg-white',
                currentId === conv.id && 'border-l-2 border-l-gray-900 bg-white'
              )}
            >
              <p
                className={cn(
                  'truncate text-xs',
                  currentId === conv.id
                    ? 'font-medium text-gray-900'
                    : 'text-gray-600'
                )}
              >
                {conv.title}
              </p>
              <p className="mt-0.5 text-[10px] text-gray-400">
                {conv.messageCount}턴 · {formatTime(conv.updatedAt)}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

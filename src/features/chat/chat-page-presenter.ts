'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'

import type { ConversationTopicModel } from '@/types'
import { DEFAULT_MODEL_ID } from '@/lib/ai-model'
import { createChatPageViewModel } from './chat-page-view-model'

// Persist conversationId in sessionStorage so it survives navigation
function getStoredConversationId(): string {
  if (typeof window === 'undefined') return ''
  return sessionStorage.getItem('amplai-conversation-id') ?? ''
}

function storeConversationId(id: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('amplai-conversation-id', id)
  }
}

export function useChatPagePresenter() {
  const router = useRouter()
  const [topics, setTopics] = useState<ConversationTopicModel[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)
  const [conversationId] = useState(() => {
    const stored = getStoredConversationId()
    if (stored) return stored
    const newId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    storeConversationId(newId)
    return newId
  })
  const messageCountRef = useRef(0)
  const restoredRef = useRef(false)

  const { messages, sendMessage, status, setMessages } = useChat({
    onFinish: () => {
      messageCountRef.current += 1
      if (messageCountRef.current % 3 === 0 && conversationId) {
        void extractTopics()
      }
    },
  })

  // Restore messages from server when page loads
  useEffect(() => {
    if (restoredRef.current || !conversationId) return
    restoredRef.current = true

    fetch(`/api/chat/messages?conversationId=${conversationId}`)
      .then((res) => res.json())
      .then((data: { messages: UIMessage[] }) => {
        if (data.messages.length > 0) {
          setMessages(data.messages)
          messageCountRef.current = Math.floor(data.messages.length / 2)
        }
      })
      .catch(() => {})
  }, [conversationId, setMessages])

  const isLoading = status === 'submitted' || status === 'streaming'

  const extractTopics = useCallback(async () => {
    if (!conversationId || messages.length < 2) return
    setIsExtracting(true)

    try {
      const res = await fetch('/api/chat/extract-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })
      const data = (await res.json()) as { topics: ConversationTopicModel[] }
      setTopics(data.topics)
    } catch {
      // Silent fail
    } finally {
      setIsExtracting(false)
    }
  }, [conversationId, messages.length])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')

    await sendMessage(
      { text },
      {
        body: {
          modelId: selectedModel,
          conversationId,
        },
      }
    )
  }, [input, isLoading, sendMessage, selectedModel, conversationId])

  const handleStartDevelopment = useCallback(async () => {
    if (messages.length === 0) {
      router.push('/benchmark')
      return
    }

    await extractTopics()

    try {
      const res = await fetch('/api/chat/extract-requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })
      const data = (await res.json()) as { requirement: string }
      if (data.requirement) {
        router.push(
          `/benchmark?requirement=${encodeURIComponent(data.requirement)}`
        )
      } else {
        router.push('/benchmark')
      }
    } catch {
      router.push('/benchmark')
    }
  }, [conversationId, messages.length, extractTopics, router])

  const handleNewConversation = useCallback(() => {
    const newId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    storeConversationId(newId)
    window.location.reload()
  }, [])

  const viewModel = createChatPageViewModel(messages.length, topics)

  return {
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
    viewModel,
    selectedModel,
    setSelectedModel,
    conversationId,
  }
}

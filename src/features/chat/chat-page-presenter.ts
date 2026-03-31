'use client'

import { useState, useCallback, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'

import type { ConversationTopicModel } from '@/types'
import { DEFAULT_MODEL_ID } from '@/lib/ai-model'
import { createChatPageViewModel } from './chat-page-view-model'

function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

export function useChatPagePresenter() {
  const router = useRouter()
  const [topics, setTopics] = useState<ConversationTopicModel[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)
  const messageCountRef = useRef(0)

  const { messages, sendMessage, status } = useChat({
    onFinish: () => {
      messageCountRef.current += 1
      if (messageCountRef.current % 3 === 0) {
        void extractTopics()
      }
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const extractTopics = useCallback(async () => {
    if (messages.length < 2) return
    setIsExtracting(true)

    try {
      const res = await fetch('/api/chat/extract-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: getTextFromMessage(m),
          })),
          modelId: selectedModel,
        }),
      })
      const data = (await res.json()) as { topics: ConversationTopicModel[] }
      setTopics(data.topics)
    } catch {
      // Silent fail — topics are supplementary
    } finally {
      setIsExtracting(false)
    }
  }, [messages, selectedModel])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return
    const text = input
    setInput('')
    await sendMessage(
      {
        text,
      },
      {
        body: { modelId: selectedModel },
      }
    )
  }, [input, isLoading, sendMessage, selectedModel])

  const handleStartDevelopment = useCallback(async () => {
    await extractTopics()

    try {
      const res = await fetch('/api/chat/extract-requirement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: getTextFromMessage(m),
          })),
          modelId: selectedModel,
        }),
      })
      const data = (await res.json()) as { requirement: string }
      router.push(
        `/benchmark?requirement=${encodeURIComponent(data.requirement)}`
      )
    } catch {
      router.push('/benchmark')
    }
  }, [messages, extractTopics, router, selectedModel])

  const viewModel = createChatPageViewModel(messages.length, topics)

  return {
    messages,
    input,
    setInput,
    handleSend,
    isLoading,
    topics,
    isExtracting,
    sidebarOpen,
    setSidebarOpen,
    extractTopics,
    handleStartDevelopment,
    viewModel,
    selectedModel,
    setSelectedModel,
  }
}

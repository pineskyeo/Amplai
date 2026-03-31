'use client'

import type { UIMessage } from 'ai'

import { cn } from '@/lib/utils'

interface Props {
  message: UIMessage
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text'
    )
    .map((part) => part.text)
    .join('')
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)

  if (!text) return null

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-gray-900 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'
        )}
      >
        {text}
      </div>
    </div>
  )
}

'use client'

import type { ChangeEvent, KeyboardEvent } from 'react'

interface Props {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSend: () => void
}

export default function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSend,
}: Props) {
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSend()
      }
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onInputChange(e.target.value)
  }

  return (
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-end gap-3">
        <textarea
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="아이디어를 말해보세요..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-gray-900 focus:outline-none placeholder:text-gray-400"
          style={{ maxHeight: '120px' }}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!input.trim() || isLoading}
          className="shrink-0 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isLoading ? '...' : '전송'}
        </button>
      </div>
    </div>
  )
}

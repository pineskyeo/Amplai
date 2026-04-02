// Server-side conversation store
// Keeps conversation history in memory (Supabase로 교체 예정)
// Solves: page navigation losing messages, JSON parsing issues

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Conversation {
  id: string
  messages: StoredMessage[]
  createdAt: number
  updatedAt: number
}

const conversations = new Map<string, Conversation>()

export function getOrCreateConversation(conversationId?: string): Conversation {
  if (conversationId && conversations.has(conversationId)) {
    return conversations.get(conversationId)!
  }

  const id =
    conversationId ??
    `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const conversation: Conversation = {
    id,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  conversations.set(id, conversation)
  return conversation
}

export function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const conv = conversations.get(conversationId)
  if (!conv) return

  conv.messages.push({ role, content, timestamp: Date.now() })
  conv.updatedAt = Date.now()
}

export function getMessages(conversationId: string): StoredMessage[] {
  return conversations.get(conversationId)?.messages ?? []
}

export function getMessagesForApi(
  conversationId: string
): Array<{ role: string; content: string }> {
  return getMessages(conversationId).map((m) => ({
    role: m.role,
    content: m.content,
  }))
}

export function deleteConversation(conversationId: string): void {
  conversations.delete(conversationId)
}

// Conversation store — Supabase persistent + in-memory fallback
// Stores conversation messages for restoration across page navigation

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

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

// In-memory cache
const conversations = new Map<string, Conversation>()

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

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

  // Create in Supabase (fire-and-forget)
  const supabase = getSupabase()
  if (supabase) {
    void supabase.from('conversations').upsert({ id }).then()
  }

  return conversation
}

export function addMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): void {
  // In-memory
  let conv = conversations.get(conversationId)
  if (!conv) {
    conv = getOrCreateConversation(conversationId)
  }
  conv.messages.push({ role, content, timestamp: Date.now() })
  conv.updatedAt = Date.now()

  // Supabase (fire-and-forget)
  const supabase = getSupabase()
  if (supabase) {
    void supabase
      .from('conversation_messages')
      .insert({ conversation_id: conversationId, role, content })
      .then()
  }
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

// Restore from Supabase (called when in-memory is empty)
export async function restoreFromSupabase(
  conversationId: string
): Promise<StoredMessage[]> {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('conversation_messages')
    .select('role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const messages: StoredMessage[] = data.map((row) => ({
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
  }))

  // Cache in memory
  const conv = getOrCreateConversation(conversationId)
  conv.messages = messages

  return messages
}

export function deleteConversation(conversationId: string): void {
  conversations.delete(conversationId)
}

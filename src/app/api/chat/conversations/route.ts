import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET() {
  const supabase = getSupabase()
  if (!supabase) {
    return Response.json({ conversations: [] })
  }

  // Get conversations with first message as preview
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('id, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error || !convs) {
    return Response.json({ conversations: [] })
  }

  // Get first user message for each conversation as title
  const conversations = await Promise.all(
    convs.map(async (conv) => {
      const { data: msgs } = await supabase
        .from('conversation_messages')
        .select('content, role')
        .eq('conversation_id', conv.id)
        .eq('role', 'user')
        .order('created_at', { ascending: true })
        .limit(1)

      const { count } = await supabase
        .from('conversation_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)

      return {
        id: conv.id,
        title: msgs?.[0]?.content?.substring(0, 50) ?? '새 대화',
        messageCount: count ?? 0,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      }
    })
  )

  // Filter out empty conversations
  const nonEmpty = conversations.filter((c) => c.messageCount > 0)

  return Response.json({ conversations: nonEmpty })
}

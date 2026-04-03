import { getMessages, restoreFromSupabase } from '@/lib/conversation-store'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const conversationId = url.searchParams.get('conversationId')

  if (!conversationId) {
    return Response.json({ messages: [] })
  }

  // Try in-memory first
  let messages = getMessages(conversationId)

  // If empty, try Supabase
  if (messages.length === 0) {
    messages = await restoreFromSupabase(conversationId)
  }

  return Response.json({
    messages: messages.map((m, i) => ({
      id: `msg-${i}`,
      role: m.role,
      parts: [{ type: 'text', text: m.content }],
    })),
  })
}

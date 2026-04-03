import { getMessages } from '@/lib/conversation-store'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const conversationId = url.searchParams.get('conversationId')

  if (!conversationId) {
    return Response.json({ messages: [] })
  }

  const messages = getMessages(conversationId)

  return Response.json({
    messages: messages.map((m, i) => ({
      id: `msg-${i}`,
      role: m.role,
      parts: [{ type: 'text', text: m.content }],
    })),
  })
}

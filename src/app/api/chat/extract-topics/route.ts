import { extractTopicsFromMessages } from '@/features/chat/api'
import { getMessagesForApi } from '@/lib/conversation-store'

export async function POST(req: Request) {
  try {
    const { conversationId } = (await req.json()) as {
      conversationId: string
    }

    const messages = getMessagesForApi(conversationId)
    if (messages.length === 0) {
      return Response.json({ topics: [] })
    }

    const topics = await extractTopicsFromMessages(messages)
    return Response.json({ topics })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[extract-topics]', err)
    return Response.json({ topics: [] })
  }
}

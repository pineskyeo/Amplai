import { generateRequirementSummary } from '@/features/chat/api'
import { getMessagesForApi } from '@/lib/conversation-store'

export async function POST(req: Request) {
  try {
    const { conversationId } = (await req.json()) as {
      conversationId: string
    }

    const messages = getMessagesForApi(conversationId)
    if (messages.length === 0) {
      return Response.json({ requirement: '' })
    }

    const requirement = await generateRequirementSummary(messages)
    return Response.json({ requirement })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[extract-requirement]', err)
    return Response.json({ requirement: '' })
  }
}

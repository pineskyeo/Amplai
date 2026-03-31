import { extractTopicsFromMessages } from '@/features/chat/api'

export async function POST(req: Request) {
  const { messages, modelId } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>
    modelId?: string
  }

  const topics = await extractTopicsFromMessages(messages, modelId)

  return Response.json({ topics })
}

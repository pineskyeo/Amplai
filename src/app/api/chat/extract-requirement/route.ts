import { generateRequirementSummary } from '@/features/chat/api'

export async function POST(req: Request) {
  const { messages, modelId } = (await req.json()) as {
    messages: Array<{ role: string; content: string }>
    modelId?: string
  }

  const requirement = await generateRequirementSummary(messages, modelId)

  return Response.json({ requirement })
}

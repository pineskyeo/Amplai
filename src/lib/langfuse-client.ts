// Langfuse LLM observability client
// Tracks every LLM call with tokens, cost, latency, and metadata

import { Langfuse } from 'langfuse'

let langfuseInstance: Langfuse | null = null

export function getLangfuse(): Langfuse | null {
  if (!process.env.LANGFUSE_SECRET_KEY || !process.env.LANGFUSE_PUBLIC_KEY) {
    return null
  }

  if (!langfuseInstance) {
    langfuseInstance = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
    })
  }

  return langfuseInstance
}

export interface TraceParams {
  name: string
  sessionId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface GenerationParams {
  name: string
  model: string
  input: unknown
  output?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  costUsd?: number
  latencyMs?: number
  metadata?: Record<string, unknown>
}

export function createTrace(params: TraceParams) {
  const langfuse = getLangfuse()
  if (!langfuse) return null

  return langfuse.trace({
    name: params.name,
    sessionId: params.sessionId,
    userId: params.userId,
    metadata: params.metadata,
  })
}

export function trackGeneration(
  traceId: string | undefined,
  params: GenerationParams
) {
  const langfuse = getLangfuse()
  if (!langfuse) return

  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: params.name })

  trace.generation({
    name: params.name,
    model: params.model,
    input: params.input,
    output: params.output,
    usage: params.usage
      ? {
          input: params.usage.inputTokens,
          output: params.usage.outputTokens,
          total: params.usage.totalTokens,
        }
      : undefined,
    metadata: {
      ...params.metadata,
      costUsd: params.costUsd,
      latencyMs: params.latencyMs,
    },
  })
}

export async function flushLangfuse(): Promise<void> {
  const langfuse = getLangfuse()
  if (langfuse) {
    await langfuse.flushAsync()
  }
}

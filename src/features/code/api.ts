import type { AIModel } from '@/types'

export async function generateCode(
  prompt: string,
  model: AIModel
): Promise<{ content: string; duration: number; lines: number }> {
  const start = Date.now()

  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, type: 'code', model }),
    })

    if (!res.ok) throw new Error('API error')
    const data = (await res.json()) as { content: string }
    const duration = Math.round((Date.now() - start) / 1000)
    const lines = data.content.split('\n').length

    return { content: data.content, duration, lines }
  } catch {
    return {
      content: `// Error generating code for ${model}`,
      duration: 0,
      lines: 1,
    }
  }
}

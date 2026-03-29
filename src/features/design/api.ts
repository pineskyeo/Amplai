import type { AIModel, DesignSubTab } from '@/types'

export async function generateDesignDocument(
  prompt: string,
  subTab: DesignSubTab,
  model: AIModel
): Promise<string> {
  const typeMap: Record<DesignSubTab, string> = {
    spec: 'spec',
    blueprint: 'spec',
    'domain-model': 'architecture',
    architecture: 'architecture',
  }

  try {
    const res = await fetch('/api/benchmark', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        type: typeMap[subTab],
        model,
      }),
    })

    if (!res.ok) throw new Error('API error')
    const data = (await res.json()) as { content: string }
    return data.content
  } catch {
    return `Failed to generate ${subTab} for ${model}.`
  }
}

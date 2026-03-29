import type { AIModel, PlanSubTab } from '@/types'

export async function generatePlanDocument(
  prompt: string,
  subTab: PlanSubTab,
  model: AIModel
): Promise<string> {
  const typeMap: Record<PlanSubTab, string> = {
    'meeting-log': 'meeting-log',
    cps: 'cps',
    prd: 'prd',
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
    return `Failed to generate ${subTab} for ${model}. Please check your API keys in .env.local.`
  }
}

import type { EvaluationMetric } from '@/types'

export async function computeEvaluationMetrics(): Promise<EvaluationMetric> {
  // In production: run RAG evaluation pipeline
  return {
    faithfulness: 0.82,
    relevance: 0.68,
    precision: 0.9,
    recall: 0.81,
  }
}

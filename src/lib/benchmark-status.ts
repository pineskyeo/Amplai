// Global benchmark status — visible from any page

export interface BenchmarkRunResult {
  scenarioId: string
  scenarioName: string
  modelId: string
  optimizationLevel: number
  timestamp: string
  turns: Array<{
    turn: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    latencyMs: number
    responsePreview: string
  }>
  totals: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    avgLatencyMs: number
  }
}

interface BenchmarkStatus {
  isRunning: boolean
  progress: string
  totalRuns: number
  completedRuns: number
  currentScenario?: string
  currentModel?: string
  startedAt?: number
  results: BenchmarkRunResult[]
}

let status: BenchmarkStatus = {
  isRunning: false,
  progress: '',
  totalRuns: 0,
  completedRuns: 0,
  results: [],
}

export function getBenchmarkStatus(): BenchmarkStatus {
  return { ...status, results: [...status.results] }
}

export function setBenchmarkRunning(
  total: number,
  scenario: string,
  model: string
): void {
  status = {
    isRunning: true,
    progress: `0/${total}: 준비 중...`,
    totalRuns: total,
    completedRuns: 0,
    currentScenario: scenario,
    currentModel: model,
    startedAt: Date.now(),
    results: [],
  }
}

export function updateBenchmarkProgress(
  completed: number,
  total: number,
  scenario: string,
  model: string
): void {
  status.completedRuns = completed
  status.totalRuns = total
  status.currentScenario = scenario
  status.currentModel = model
  status.progress = `${completed}/${total}: ${scenario} × ${model}`
}

export function addBenchmarkResult(result: BenchmarkRunResult): void {
  status.results.push(result)
}

export function setBenchmarkDone(): void {
  status.isRunning = false
  status.progress = `완료 (${status.results.length}건)`
}

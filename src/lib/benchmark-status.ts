// Global benchmark status — visible from any page

interface BenchmarkStatus {
  isRunning: boolean
  progress: string
  totalRuns: number
  completedRuns: number
  currentScenario?: string
  currentModel?: string
  startedAt?: number
}

let status: BenchmarkStatus = {
  isRunning: false,
  progress: '',
  totalRuns: 0,
  completedRuns: 0,
}

export function getBenchmarkStatus(): BenchmarkStatus {
  return { ...status }
}

export function setBenchmarkRunning(
  total: number,
  scenario: string,
  model: string
): void {
  status = {
    isRunning: true,
    progress: `${scenario} × ${model}`,
    totalRuns: total,
    completedRuns: 0,
    currentScenario: scenario,
    currentModel: model,
    startedAt: Date.now(),
  }
}

export function updateBenchmarkProgress(
  completed: number,
  scenario: string,
  model: string
): void {
  status.completedRuns = completed
  status.currentScenario = scenario
  status.currentModel = model
  status.progress = `${completed}/${status.totalRuns}: ${scenario} × ${model}`
}

export function setBenchmarkDone(): void {
  status = {
    isRunning: false,
    progress: '',
    totalRuns: 0,
    completedRuns: 0,
  }
}

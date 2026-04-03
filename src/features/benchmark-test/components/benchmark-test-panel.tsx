'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

import { cn } from '@/lib/utils'
import { MODEL_OPTIONS } from '@/lib/ai-model'

interface Scenario {
  id: string
  name: string
  description: string
  messages: Array<{ role: string; content: string }>
}

interface TurnResult {
  turn: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  latencyMs: number
  responsePreview: string
}

interface TestResult {
  scenarioId: string
  scenarioName: string
  modelId: string
  optimizationLevel: number
  timestamp: string
  turns: TurnResult[]
  totals: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    costUsd: number
    avgLatencyMs: number
  }
}

interface BenchmarkStatusData {
  isRunning: boolean
  progress: string
  totalRuns: number
  completedRuns: number
  results: TestResult[]
}

// Poll benchmark status from server
let cachedBenchStatus: BenchmarkStatusData | null = null
let benchListeners: Array<() => void> = []
let benchPolling = false

function subscribeBench(listener: () => void) {
  benchListeners.push(listener)
  if (!benchPolling) {
    benchPolling = true
    const poll = () => {
      fetch('/api/benchmark-test/status')
        .then((r) => r.json())
        .then((data: BenchmarkStatusData) => {
          cachedBenchStatus = data
          for (const l of benchListeners) l()
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => {
      benchListeners = benchListeners.filter((l) => l !== listener)
      if (benchListeners.length === 0) {
        clearInterval(id)
        benchPolling = false
      }
    }
  }
  return () => {
    benchListeners = benchListeners.filter((l) => l !== listener)
    if (benchListeners.length === 0) benchPolling = false
  }
}

function getBenchSnapshot() {
  return cachedBenchStatus
}

export default function BenchmarkTestPanel() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(
    new Set()
  )
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(['deepseek'])
  )
  const [level, setLevel] = useState(0)
  const [expanded, setExpanded] = useState(true)

  const benchStatus = useSyncExternalStore(
    subscribeBench,
    getBenchSnapshot,
    () => null
  )

  useEffect(() => {
    fetch('/api/benchmark-test/scenarios')
      .then((r) => r.json())
      .then((data: { scenarios: Scenario[] }) => {
        setScenarios(data.scenarios)
        setSelectedScenarios(new Set(data.scenarios.map((s) => s.id)))
      })
      .catch(() => {})
  }, [])

  const toggleScenario = useCallback((id: string) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleModel = useCallback((id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const runBenchmark = useCallback(async () => {
    if (selectedScenarios.size === 0 || selectedModels.size === 0) return

    const scenarioList = scenarios.filter((s) => selectedScenarios.has(s.id))
    const modelList = Array.from(selectedModels)

    // Fire-and-forget — server runs in background
    await fetch('/api/benchmark-test/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenarios: scenarioList,
        models: modelList,
        optimizationLevel: level,
      }),
    })
  }, [scenarios, selectedScenarios, selectedModels, level])

  const isRunning = benchStatus?.isRunning ?? false
  const results = benchStatus?.results ?? []

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Benchmark Test
          </h3>
          <p className="text-[11px] text-gray-400">
            {isRunning
              ? benchStatus?.progress
              : '시나리오 × 모델 조합으로 성능 측정'}
          </p>
        </div>
        <span className="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {/* Scenarios */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-700">시나리오</p>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggleScenario(s.id)}
                  disabled={isRunning}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    selectedScenarios.has(s.id)
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400',
                    isRunning && 'opacity-50'
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Models */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-700">모델</p>
            <div className="flex flex-wrap gap-2">
              {MODEL_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleModel(m.id)}
                  disabled={isRunning}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    selectedModels.has(m.id)
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400',
                    isRunning && 'opacity-50'
                  )}
                >
                  {m.name} ({m.cost})
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-gray-700">
              Optimization Level
            </p>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4].map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  disabled={isRunning}
                  className={cn(
                    'rounded-lg border px-3 py-1 text-xs transition-colors',
                    level === l
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400',
                    isRunning && 'opacity-50'
                  )}
                >
                  L{l}
                </button>
              ))}
            </div>
          </div>

          {/* Run button + progress */}
          <button
            onClick={runBenchmark}
            disabled={
              isRunning ||
              selectedScenarios.size === 0 ||
              selectedModels.size === 0
            }
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isRunning
              ? benchStatus?.progress
              : `벤치마크 실행 (${selectedScenarios.size} × ${selectedModels.size} = ${selectedScenarios.size * selectedModels.size} runs)`}
          </button>

          {isRunning && benchStatus && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-gray-900 transition-all"
                style={{
                  width: `${benchStatus.totalRuns > 0 ? Math.round((benchStatus.completedRuns / benchStatus.totalRuns) * 100) : 0}%`,
                }}
              />
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-700">
                결과 ({results.length}건)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-3">Scenario</th>
                      <th className="py-2 pr-3">Model</th>
                      <th className="py-2 pr-3 text-right">Tokens</th>
                      <th className="py-2 pr-3 text-right">Cost</th>
                      <th className="py-2 text-right">Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 text-gray-700"
                      >
                        <td className="py-2 pr-3">{r.scenarioId}</td>
                        <td className="py-2 pr-3">{r.modelId}</td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {r.totals.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">
                          ${r.totals.costUsd.toFixed(4)}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {r.totals.avgLatencyMs}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 font-medium text-gray-900">
                      <td className="py-2 pr-3" colSpan={2}>
                        Total
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">
                        {results
                          .reduce((s, r) => s + r.totals.totalTokens, 0)
                          .toLocaleString()}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">
                        $
                        {results
                          .reduce((s, r) => s + r.totals.costUsd, 0)
                          .toFixed(4)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {Math.round(
                          results.reduce(
                            (s, r) => s + r.totals.avgLatencyMs,
                            0
                          ) / results.length
                        )}
                        ms
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {results.map((r, ri) => (
                <details key={ri} className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-gray-400 hover:text-gray-600">
                    {r.scenarioId} × {r.modelId} — 턴별 상세
                  </summary>
                  <div className="mt-1 space-y-1 pl-2">
                    {r.turns.map((t) => {
                      const bar = '█'.repeat(
                        Math.min(Math.floor(t.inputTokens / 50), 30)
                      )
                      return (
                        <div
                          key={t.turn}
                          className="font-mono text-[10px] text-gray-500"
                        >
                          T{t.turn} {bar} {t.inputTokens}+{t.outputTokens}tok $
                          {t.costUsd.toFixed(4)} {t.latencyMs}ms
                        </div>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

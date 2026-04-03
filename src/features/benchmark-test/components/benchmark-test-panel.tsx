'use client'

import { useState, useEffect, useCallback } from 'react'

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

export default function BenchmarkTestPanel() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(
    new Set()
  )
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set(['deepseek'])
  )
  const [level, setLevel] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [results, setResults] = useState<TestResult[]>([])
  const [expanded, setExpanded] = useState(true)

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

    setIsRunning(true)
    setResults([])

    const scenarioList = scenarios.filter((s) => selectedScenarios.has(s.id))
    const modelList = Array.from(selectedModels)
    const total = scenarioList.length * modelList.length
    let done = 0

    const allResults: TestResult[] = []

    for (const model of modelList) {
      for (const scenario of scenarioList) {
        done++
        setProgress(`${done}/${total}: ${scenario.name} × ${model}`)

        try {
          const res = await fetch('/api/benchmark-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scenarioId: scenario.id,
              modelId: model,
              optimizationLevel: level,
              messages: scenario.messages,
            }),
          })

          const result = (await res.json()) as TestResult
          allResults.push(result)
          setResults([...allResults])
        } catch {
          // Continue with next
        }
      }
    }

    setProgress('')
    setIsRunning(false)
  }, [scenarios, selectedScenarios, selectedModels, level])

  return (
    <div className="rounded-lg border border-gray-200">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Benchmark Test
          </h3>
          <p className="text-[11px] text-gray-400">
            시나리오 × 모델 조합으로 성능 측정
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
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    selectedScenarios.has(s.id)
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
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
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    selectedModels.has(m.id)
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
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
                  className={cn(
                    'rounded-lg border px-3 py-1 text-xs transition-colors',
                    level === l
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'
                  )}
                >
                  L{l}
                </button>
              ))}
            </div>
          </div>

          {/* Run button */}
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
              ? progress
              : `벤치마크 실행 (${selectedScenarios.size} × ${selectedModels.size} = ${selectedScenarios.size * selectedModels.size} runs)`}
          </button>

          {/* Results */}
          {results.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-700">결과</p>
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

              {/* Turn detail for each result */}
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

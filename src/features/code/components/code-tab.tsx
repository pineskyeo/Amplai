'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AIModel, Case, BenchmarkResult } from '@/types'

interface Props {
  cases: Case[]
  runId: string | null
  activeAgent: AIModel
  benchmarkResult: BenchmarkResult | null
  isRunning: boolean
}

const AGENTS: AIModel[] = ['codex', 'gemini', 'claude']
const AGENT_LABELS: Record<AIModel, string> = {
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  claude: 'Claude Code',
}

export default function CodeTab({ runId, benchmarkResult, isRunning }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  const status = !runId
    ? 'idle'
    : isRunning
      ? 'loading'
      : benchmarkResult
        ? 'done'
        : 'loading'

  const agentFiles: Record<AIModel, string[]> = {
    codex: benchmarkResult?.codex.files.map((f) => f.path) ?? [],
    gemini: benchmarkResult?.gemini.files.map((f) => f.path) ?? [],
    claude: benchmarkResult?.claude.files.map((f) => f.path) ?? [],
  }

  const allFiles = [
    ...new Set([
      ...agentFiles.codex,
      ...agentFiles.gemini,
      ...agentFiles.claude,
    ]),
  ]
  const activeFile = selectedFile ?? allFiles[0] ?? null

  function getCode(agent: AIModel): string {
    if (!benchmarkResult) return ''
    const files = benchmarkResult[agent].files
    return (
      files.find((f) => f.path === activeFile)?.content ??
      '// file not generated'
    )
  }

  function formatMs(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Generated Code</h2>
        <p className="text-sm text-gray-500 mt-1.5">
          3개 AI Agent가 동일한 요구사항에서 생성한 MVPVM 코드를 비교합니다.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-6">
        {AGENTS.map((model) => {
          const result = benchmarkResult?.[model]
          return (
            <div key={model} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-800">
                  {AGENT_LABELS[model]}
                </span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    status === 'done'
                      ? 'bg-green-50 text-green-700'
                      : status === 'loading'
                        ? 'bg-yellow-50 text-yellow-600 animate-pulse'
                        : 'bg-gray-100 text-gray-400'
                  )}
                >
                  {status === 'done'
                    ? 'done'
                    : status === 'loading'
                      ? 'generating…'
                      : 'idle'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Time
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result ? formatMs(result.generationMs) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Files
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result ? result.files.length : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">
                    Lines
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {result
                      ? result.files.reduce(
                          (acc, f) => acc + f.content.split('\n').length,
                          0
                        )
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* File Selector */}
      {allFiles.length > 0 && (
        <div className="mb-4">
          <select
            value={activeFile ?? ''}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700 font-mono focus:outline-none focus:border-gray-400 bg-white"
          >
            {allFiles.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Code Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {AGENTS.map((model) => (
          <div
            key={model}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600">
                {AGENT_LABELS[model]}
              </span>
            </div>
            <div className="p-4 bg-gray-950 min-h-64 overflow-auto">
              {status === 'loading' ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-3 bg-gray-800 rounded animate-pulse"
                      style={{ width: `${55 + ((i * 7) % 45)}%` }}
                    />
                  ))}
                </div>
              ) : status === 'done' ? (
                <pre className="text-gray-300 text-xs leading-relaxed whitespace-pre-wrap">
                  {getCode(model)}
                </pre>
              ) : (
                <p className="text-xs text-gray-600 italic">
                  Run benchmark to generate code.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

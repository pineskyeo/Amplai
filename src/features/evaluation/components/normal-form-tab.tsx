'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { AIModel } from '@/types'

interface Props {
  runId: string | null
}

const AGENTS: AIModel[] = ['codex', 'gemini', 'claude']
const AGENT_LABELS: Record<AIModel, string> = {
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  claude: 'Claude Code',
}

const CONVERGENCE_FILES = [
  'restaurant-model.ts',
  'restaurant-repository.ts',
  'supabase-response-entity.ts',
  'supabase-adapter.ts',
  'restaurant-repository-supabase.ts',
  'restaurants-page.tsx',
  'restaurants-page-presenter.ts',
  'restaurants-page-view-model.ts',
  'restaurants-page-view-desktop.tsx',
]

const DIFF_STATUS: Record<
  AIModel,
  Record<string, 'identical' | 'minor' | 'different'>
> = {
  codex: {
    'restaurant-model.ts': 'identical',
    'restaurant-repository.ts': 'minor',
    'supabase-response-entity.ts': 'identical',
    'supabase-adapter.ts': 'different',
    'restaurant-repository-supabase.ts': 'minor',
    'restaurants-page.tsx': 'identical',
    'restaurants-page-presenter.ts': 'minor',
    'restaurants-page-view-model.ts': 'different',
    'restaurants-page-view-desktop.tsx': 'identical',
  },
  gemini: {
    'restaurant-model.ts': 'identical',
    'restaurant-repository.ts': 'identical',
    'supabase-response-entity.ts': 'minor',
    'supabase-adapter.ts': 'minor',
    'restaurant-repository-supabase.ts': 'identical',
    'restaurants-page.tsx': 'identical',
    'restaurants-page-presenter.ts': 'minor',
    'restaurants-page-view-model.ts': 'minor',
    'restaurants-page-view-desktop.tsx': 'identical',
  },
  claude: {
    'restaurant-model.ts': 'identical',
    'restaurant-repository.ts': 'identical',
    'supabase-response-entity.ts': 'identical',
    'supabase-adapter.ts': 'identical',
    'restaurant-repository-supabase.ts': 'identical',
    'restaurants-page.tsx': 'identical',
    'restaurants-page-presenter.ts': 'identical',
    'restaurants-page-view-model.ts': 'identical',
    'restaurants-page-view-desktop.tsx': 'identical',
  },
}

function convergenceScore(model: AIModel): number {
  const values = Object.values(DIFF_STATUS[model])
  const identical = values.filter((v) => v === 'identical').length
  const minor = values.filter((v) => v === 'minor').length
  return Math.round(((identical * 1 + minor * 0.5) / values.length) * 100)
}

export default function NormalFormTab({ runId }: Props) {
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  useEffect(() => {
    if (runId) {
      const timer = setTimeout(() => setStatus('done'), 3500)
      return () => clearTimeout(timer)
    }
  }, [runId])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Normal Form — Structural Convergence
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          하네스를 통과한 결과물들이 얼마나 동일한 구조적 Normal Form으로
          수렴하는지 측정합니다.
        </p>
      </div>

      {/* Convergence Scores */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {AGENTS.map((model) => {
          const score = convergenceScore(model)
          return (
            <div
              key={model}
              className="border border-gray-200 rounded-lg p-5 text-center"
            >
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {AGENT_LABELS[model]}
              </p>
              {status === 'done' ? (
                <>
                  <p
                    className={cn(
                      'text-4xl font-bold mb-1',
                      score >= 90
                        ? 'text-green-600'
                        : score >= 70
                          ? 'text-yellow-500'
                          : 'text-red-500'
                    )}
                  >
                    {score}%
                  </p>
                  <p className="text-xs text-gray-400">
                    structural convergence
                  </p>
                </>
              ) : (
                <div className="h-10 bg-gray-100 rounded animate-pulse mx-auto w-20" />
              )}
            </div>
          )
        })}
      </div>

      {/* File-level comparison */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            File Structure Comparison
          </p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-2.5 text-xs text-gray-400 font-medium">
                File
              </th>
              {AGENTS.map((model) => (
                <th
                  key={model}
                  className="text-center px-4 py-2.5 text-xs text-gray-400 font-medium"
                >
                  {AGENT_LABELS[model].split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONVERGENCE_FILES.map((file, idx) => (
              <tr
                key={file}
                className={cn(
                  'border-b border-gray-50',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                )}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-gray-600">
                  {file}
                </td>
                {AGENTS.map((model) => {
                  const s = status === 'done' ? DIFF_STATUS[model][file] : null
                  return (
                    <td key={model} className="px-4 py-2.5 text-center">
                      {s === 'identical' ? (
                        <span className="text-xs text-green-600 font-medium">
                          identical
                        </span>
                      ) : s === 'minor' ? (
                        <span className="text-xs text-yellow-600 font-medium">
                          minor diff
                        </span>
                      ) : s === 'different' ? (
                        <span className="text-xs text-red-500 font-medium">
                          different
                        </span>
                      ) : (
                        <span className="inline-block w-12 h-2.5 bg-gray-100 rounded animate-pulse" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

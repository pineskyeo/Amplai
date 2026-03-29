'use client'

import { useState, useEffect, useReducer } from 'react'
import { cn } from '@/lib/utils'
import type {
  AIModel,
  PlanSubTab,
  PlanBenchmarkResult,
  PlanResult,
} from '@/types'

interface Props {
  runId: string | null
  requirement: string | null
  activeAgent: AIModel
}

type FetchState = { result: PlanBenchmarkResult | null; loading: boolean }
type FetchAction =
  | { type: 'start' }
  | { type: 'done'; result: PlanBenchmarkResult }
  | { type: 'error' }

function fetchReducer(_state: FetchState, action: FetchAction): FetchState {
  if (action.type === 'start') return { result: null, loading: true }
  if (action.type === 'done') return { result: action.result, loading: false }
  return { result: null, loading: false }
}

const PLAN_SUBTABS: { id: PlanSubTab; label: string }[] = [
  { id: 'meeting-log', label: 'Meeting Log' },
  { id: 'cps', label: 'CPS' },
  { id: 'prd', label: 'PRD' },
]

const AGENTS: AIModel[] = ['codex', 'gemini', 'claude']

const AGENT_LABELS: Record<AIModel, string> = {
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  claude: 'Claude Code',
}

const SUBTAB_KEY: Record<PlanSubTab, keyof PlanResult> = {
  'meeting-log': 'meetingLog',
  cps: 'cps',
  prd: 'prd',
}

function AgentColumnHeader({
  model,
  isLoading,
  isDone,
}: {
  model: AIModel
  isLoading: boolean
  isDone: boolean
}) {
  const status = isLoading ? 'loading' : isDone ? 'done' : 'idle'
  return (
    <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
      <span className="text-sm font-semibold text-gray-800">
        {AGENT_LABELS[model]}
      </span>
      <span
        className={cn(
          'text-xs px-2 py-0.5 rounded-full',
          status === 'done'
            ? 'bg-green-50 text-green-700'
            : status === 'loading'
              ? 'bg-yellow-50 text-yellow-700'
              : 'bg-gray-100 text-gray-400'
        )}
      >
        {status === 'done'
          ? 'generated'
          : status === 'loading'
            ? 'generating...'
            : 'idle'}
      </span>
    </div>
  )
}

export default function PlanTab({ runId, requirement }: Props) {
  const [subTab, setSubTab] = useState<PlanSubTab>('meeting-log')
  const [{ result: planResult, loading: isLoading }, dispatch] = useReducer(
    fetchReducer,
    { result: null, loading: false }
  )

  useEffect(() => {
    if (!runId || !requirement) return
    let cancelled = false

    dispatch({ type: 'start' })

    fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirement }),
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled)
          dispatch({ type: 'done', result: data as PlanBenchmarkResult })
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [runId, requirement])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Requirements &amp; Planning Phase
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          요구사항 → AI 분석 → Meeting Log, CPS, PRD 문서를 자동 생성합니다.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {PLAN_SUBTABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              subTab === tab.id
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3 Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {AGENTS.map((model) => {
          const content = planResult?.[model][SUBTAB_KEY[subTab]]
          return (
            <div key={model} className="border border-gray-200 rounded-lg p-5">
              <AgentColumnHeader
                model={model}
                isLoading={isLoading}
                isDone={!!planResult}
              />
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
                </div>
              ) : content ? (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                  {content}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Run the benchmark to generate {subTab.replace('-', ' ')}.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

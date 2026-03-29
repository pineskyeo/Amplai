'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import InputTab from '@/features/input/components/input-tab'
import PlanTab from '@/features/plan/components/plan-tab'
import DesignTab from '@/features/design/components/design-tab'
import CodeTab from '@/features/code/components/code-tab'
import LintTab from '@/features/lint/components/lint-tab'
import NormalFormTab from '@/features/evaluation/components/normal-form-tab'
import Logo from '@/components/ui/logo'
import type { TabId, AIModel, Case, BenchmarkResult } from '@/types'

const TABS: { id: TabId; label: string }[] = [
  { id: '01-input', label: '01 Input' },
  { id: '02-plan', label: '02 Plan' },
  { id: '03-design', label: '03 Design' },
  { id: '04-code', label: '04 Code' },
  { id: '05-lint', label: '05 Lint' },
  { id: '06-normal-form', label: '06 Normal Form' },
]

const AGENTS: { id: AIModel; label: string; prefix: string }[] = [
  { id: 'codex', label: 'Codex CLI', prefix: 'A' },
  { id: 'gemini', label: 'Gemini CLI', prefix: 'B' },
  { id: 'claude', label: 'Claude Code', prefix: 'C' },
]

const DEFAULT_CASES: Case[] = [
  {
    id: '01',
    number: '01',
    title: 'DIO이츠 고객용',
    description: '음식 주문, 배달 추적, 다파 사용자가 주문 가능한 고객 앱',
    prompt: '"DIO이츠 고객 앱 만들어줘"',
    sourceType: 'text',
  },
  {
    id: '02',
    number: '02',
    title: 'DIO이츠 기사용',
    description: '배달 수락, 경로 안내, 현장 확인이 가능한 기사용 앱',
    prompt: '"DIO이츠 배달 기사용 앱 만들어줘"',
    sourceType: 'text',
  },
  {
    id: '03',
    number: '03',
    title: 'DIO이츠 음식점용',
    description: '주문 접수, 메뉴 관리, 대응 줄이기 가능한 음식점용 앱',
    prompt: '"DIO이츠 음식점 사용앱을 만들어줘"',
    sourceType: 'text',
  },
  {
    id: '04',
    number: '04',
    title: 'DIO이츠 백오피스 어드민',
    description: '사용자 관리, 주문 모니터링, 정산 처리 가능한 어드민',
    prompt: '"DIO이츠 음식 어드민 대시보드를 만들어줘"',
    sourceType: 'text',
  },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('01-input')
  const [activeAgent, setActiveAgent] = useState<AIModel>('codex')
  const [cases, setCases] = useState<Case[]>(DEFAULT_CASES)
  const [runId, setRunId] = useState<string | null>(null)
  const [activeRequirement, setActiveRequirement] = useState<string | null>(
    null
  )
  const [isRunning, setIsRunning] = useState(false)
  const [benchmarkResult, setBenchmarkResult] =
    useState<BenchmarkResult | null>(null)

  return (
    <div className="min-h-screen bg-white">
      {/* Top Header */}
      <div className="border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Logo size="md" />
          <p className="text-xs text-gray-500 mt-0.5 hidden md:block">
            3 AI Agents — Structural Convergence Benchmark
          </p>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setActiveAgent(agent.id)}
              className={cn(
                'flex items-center gap-1 px-2 md:px-3 py-1.5 rounded text-xs font-medium border transition-colors',
                activeAgent === agent.id
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              )}
            >
              <span className="text-[10px] opacity-60">{agent.prefix}</span>
              <span className="hidden sm:inline">{agent.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 px-4 md:px-8 overflow-x-auto">
        <div className="flex gap-4 md:gap-6 whitespace-nowrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'py-3 text-xs md:text-sm font-medium transition-colors border-b-2 -mb-px shrink-0',
                activeTab === tab.id
                  ? 'text-gray-900 border-gray-900'
                  : 'text-gray-400 border-transparent hover:text-gray-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-8 py-6 md:py-8">
        {activeTab === '01-input' && (
          <InputTab
            cases={cases}
            onCasesChange={setCases}
            onRun={async (requirement, caseId) => {
              setIsRunning(true)
              setBenchmarkResult(null)
              const id = `run_${Date.now()}`
              setRunId(id)
              setActiveRequirement(requirement)
              setActiveTab('04-code')
              try {
                const res = await fetch('/api/benchmark', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ requirement, caseId }),
                })
                const result = (await res.json()) as BenchmarkResult
                setBenchmarkResult(result)
              } finally {
                setIsRunning(false)
              }
            }}
            isRunning={isRunning}
          />
        )}
        {activeTab === '02-plan' && (
          <PlanTab
            runId={runId}
            requirement={activeRequirement}
            activeAgent={activeAgent}
          />
        )}
        {activeTab === '03-design' && (
          <DesignTab cases={cases} runId={runId} activeAgent={activeAgent} />
        )}
        {activeTab === '04-code' && (
          <CodeTab
            cases={cases}
            runId={runId}
            activeAgent={activeAgent}
            benchmarkResult={benchmarkResult}
            isRunning={isRunning}
          />
        )}
        {activeTab === '05-lint' && (
          <LintTab runId={runId} benchmarkResult={benchmarkResult} />
        )}
        {activeTab === '06-normal-form' && <NormalFormTab runId={runId} />}
      </div>
    </div>
  )
}

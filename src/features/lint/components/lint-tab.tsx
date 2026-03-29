'use client'

import { cn } from '@/lib/utils'
import type { AIModel, BenchmarkResult } from '@/types'

interface Props {
  runId: string | null
  benchmarkResult: BenchmarkResult | null
}

const AGENTS: AIModel[] = ['codex', 'gemini', 'claude']
const AGENT_LABELS: Record<AIModel, string> = {
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  claude: 'Claude Code',
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  'file-kebab-case': '파일명 kebab-case 강제',
  'no-list-detail-suffix': '-list/-detail suffix 금지',
  'no-interface-prefix': 'I 접두사 금지',
  'suffix-naming': 'Repository/ViewModel suffix 강제',
  'array-prop-plural': 'Array prop 복수형 강제',
  'presenter-naming': 'useXxxPresenter 패턴 강제',
  'no-default-export-model': 'model named export 강제',
  'no-direct-supabase': '컴포넌트 Supabase 직접 호출 금지',
  'layer-boundary': 'MVPVM 레이어 경계 강제',
}

const RULES = Object.keys(RULE_DESCRIPTIONS)

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all duration-700',
            score === 100
              ? 'bg-green-500'
              : score >= 70
                ? 'bg-yellow-400'
                : 'bg-red-400'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={cn(
          'text-lg font-bold tabular-nums w-12 text-right',
          score === 100
            ? 'text-green-600'
            : score >= 70
              ? 'text-yellow-600'
              : 'text-red-500'
        )}
      >
        {score}%
      </span>
    </div>
  )
}

export default function LintTab({ runId, benchmarkResult }: Props) {
  const status = !runId ? 'idle' : benchmarkResult ? 'done' : 'loading'

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Lint Harness Results
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          ESLint harness ({RULES.length} rules)가 각 AI 모델의 코드 출력을
          구조적으로 검증합니다.
        </p>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6 mb-8">
        {AGENTS.map((model) => {
          const score = benchmarkResult?.[model].score ?? 0
          return (
            <div key={model} className="border border-gray-200 rounded-lg p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {AGENT_LABELS[model]}
              </p>
              {status === 'done' ? (
                <ScoreBar score={score} />
              ) : (
                <div className="h-2 bg-gray-100 rounded-full animate-pulse" />
              )}
            </div>
          )
        })}
      </div>

      {/* Rules Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden mb-8 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-52">
                Rule
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Description
              </th>
              {AGENTS.map((model) => (
                <th
                  key={model}
                  className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28"
                >
                  {AGENT_LABELS[model].split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RULES.map((rule, idx) => (
              <tr
                key={rule}
                className={cn(
                  'border-b border-gray-100 last:border-0',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                )}
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-800">
                  {rule}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {RULE_DESCRIPTIONS[rule]}
                </td>
                {AGENTS.map((model) => {
                  const result = benchmarkResult?.[model].ruleResults[rule]
                  return (
                    <td key={model} className="px-4 py-3 text-center">
                      {status === 'done' ? (
                        <span
                          className={cn(
                            'inline-block w-4 h-4 rounded-full text-[10px] font-bold leading-4 text-center',
                            result === 'pass'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-600'
                          )}
                        >
                          {result === 'pass' ? '✓' : '✕'}
                        </span>
                      ) : (
                        <span className="inline-block w-4 h-4 rounded-full bg-gray-100" />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Violations Detail */}
      {status === 'done' && benchmarkResult && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Violations Detail
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AGENTS.map((model) => {
              const violations = benchmarkResult[model].violations
              return (
                <div
                  key={model}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    {AGENT_LABELS[model]} — {violations.length} violation
                    {violations.length !== 1 ? 's' : ''}
                  </p>
                  {violations.length === 0 ? (
                    <p className="text-xs text-green-600">All rules pass ✓</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {violations.map((v, i) => (
                        <li key={i} className="text-xs text-gray-600">
                          <span className="font-mono text-red-500">
                            {v.rule}
                          </span>
                          <span className="text-gray-400">
                            {' '}
                            · {v.file.split('/').pop()}
                          </span>
                          <br />
                          <span className="text-gray-500 pl-2">
                            {v.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

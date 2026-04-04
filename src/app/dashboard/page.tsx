'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface TokenGrowthItem {
  turn: number
  input: number
  output: number
  total: number
}

interface BenchmarkResult {
  scenarioId: string
  scenarioName: string
  modelId: string
  optimizationLevel: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  costUsd: number
  avgLatencyMs: number
  turnsJson: Array<{
    turn: number
    inputTokens: number
    outputTokens: number
    costUsd: number
    latencyMs: number
  }>
  createdAt: string
}

interface DashboardData {
  summary: {
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    totalCostUsd: number
    avgLatencyMs: number
  }
  modelBreakdown: Array<{
    model: string
    input: number
    output: number
    cost: number
    count: number
    avgLatency: number
  }>
  timeline: Array<{
    time: string
    input: number
    output: number
    cost: number
    count: number
  }>
  cumulativeCost: Array<{ time: string; cost: number }>
  tokenGrowth: TokenGrowthItem[]
  sessionIds: Array<{ id: string; label: string }>
  tokenGrowthBySession: Record<string, TokenGrowthItem[]>
  optimizationLevels: Array<{
    level: number
    input: number
    output: number
    cost: number
    count: number
    avgLatency: number
  }>
  benchmarkResults: BenchmarkResult[]
}

const PIE_COLORS = [
  '#111827',
  '#6b7280',
  '#d1d5db',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
]

interface StatCardProps {
  label: string
  value: string
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const BENCH_COLORS = [
  '#111827',
  '#6b7280',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
]

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string>('all')
  const [benchMetric, setBenchMetric] = useState<'tokens' | 'cost' | 'latency'>(
    'tokens'
  )

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      const json = (await res.json()) as DashboardData
      setData(json)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(() => void fetchData(), 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Loading dashboard...</p>
      </div>
    )
  }

  if (!data || data.summary.totalRequests === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-400">
          데이터가 없습니다. Chat에서 대화를 시작하세요.
        </p>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Chat으로 이동
        </Link>
      </div>
    )
  }

  const { summary } = data

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 md:px-8">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Amplai Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            LLM Token Usage & Cost Observability
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            ← Chat
          </Link>
          <Link
            href="/benchmark"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Benchmark
          </Link>
        </div>
      </div>

      <div className="px-4 py-6 md:px-8 md:py-8">
        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Requests"
            value={summary.totalRequests.toLocaleString()}
          />
          <StatCard
            label="Total Tokens"
            value={summary.totalTokens.toLocaleString()}
            sub={`in: ${summary.totalInputTokens.toLocaleString()} / out: ${summary.totalOutputTokens.toLocaleString()}`}
          />
          <StatCard
            label="Total Cost"
            value={`$${summary.totalCostUsd.toFixed(4)}`}
          />
          <StatCard
            label="Avg Latency"
            value={`${summary.avgLatencyMs.toLocaleString()}ms`}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Token Growth per Turn (with session filter) */}
          <div className="rounded-lg border border-gray-200 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                턴별 토큰 증가 추이
              </h3>
              {data.sessionIds.length > 0 && (
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-600"
                >
                  <option value="all">전체 세션</option>
                  {data.sessionIds.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={
                  selectedSession === 'all'
                    ? data.tokenGrowth
                    : (data.tokenGrowthBySession[selectedSession] ?? [])
                }
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="turn" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="input"
                  stackId="1"
                  stroke="#111827"
                  fill="#111827"
                  fillOpacity={0.3}
                  name="Input"
                />
                <Area
                  type="monotone"
                  dataKey="output"
                  stackId="1"
                  stroke="#6b7280"
                  fill="#6b7280"
                  fillOpacity={0.2}
                  name="Output"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Cumulative Cost */}
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              누적 비용 추이
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.cumulativeCost}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `$${v.toFixed(3)}`}
                />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(4)}`}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative Cost"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Model Breakdown — Bar Chart */}
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              모델별 토큰 사용량
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.modelBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="input"
                  fill="#111827"
                  name="Input"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="output"
                  fill="#9ca3af"
                  name="Output"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Model Breakdown — Pie Chart (Cost) */}
          <div className="rounded-lg border border-gray-200 p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              모델별 비용 비중
            </h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={data.modelBreakdown}
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="cost"
                    nameKey="model"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.modelBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `$${Number(value).toFixed(4)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {data.modelBreakdown.map((m, i) => (
                  <div key={m.model} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: PIE_COLORS[i % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-xs text-gray-600">
                      {m.model} ({m.count}x) — ${m.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="text-lg font-bold text-gray-900">
                    ${summary.totalCostUsd.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-gray-400">total cost</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optimization Level Comparison (shows when benchmark data exists) */}
        {data.optimizationLevels.length > 1 && (
          <div className="mt-6 rounded-lg border border-gray-200 p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">
              최적화 단계별 비교
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.optimizationLevels}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="level"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => `Level ${v}`}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="input"
                  fill="#111827"
                  name="Input Tokens"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="output"
                  fill="#9ca3af"
                  name="Output Tokens"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Benchmark Scenario Comparison Chart */}
        {data.benchmarkResults.length > 0 && (
          <>
            <div className="mt-6 rounded-lg border border-gray-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  시나리오별 벤치마크 비교
                </h3>
                <div className="flex gap-1">
                  {(
                    [
                      { key: 'tokens', label: 'Tokens' },
                      { key: 'cost', label: 'Cost' },
                      { key: 'latency', label: 'Latency' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setBenchMetric(m.key)}
                      className={`rounded px-2.5 py-1 text-xs transition-colors ${
                        benchMetric === m.key
                          ? 'bg-gray-900 text-white'
                          : 'border border-gray-200 text-gray-500 hover:border-gray-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={(() => {
                    const scenarios = [
                      ...new Set(
                        data.benchmarkResults.map((r) => r.scenarioId)
                      ),
                    ]
                    const models = [
                      ...new Set(data.benchmarkResults.map((r) => r.modelId)),
                    ]
                    return scenarios.map((sid) => {
                      const row: Record<string, string | number> = {
                        scenario:
                          data.benchmarkResults.find(
                            (r) => r.scenarioId === sid
                          )?.scenarioName ?? sid,
                      }
                      for (const mid of models) {
                        const match = data.benchmarkResults.find(
                          (r) => r.scenarioId === sid && r.modelId === mid
                        )
                        if (match) {
                          if (benchMetric === 'tokens')
                            row[mid] = match.totalTokens
                          else if (benchMetric === 'cost')
                            row[mid] = Number(match.costUsd.toFixed(4))
                          else row[mid] = match.avgLatencyMs
                        }
                      }
                      return row
                    })
                  })()}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="scenario"
                    tick={{ fontSize: 10 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      benchMetric === 'cost'
                        ? `$${v.toFixed(3)}`
                        : benchMetric === 'latency'
                          ? `${v}ms`
                          : v.toLocaleString()
                    }
                  />
                  <Tooltip
                    formatter={(value) => {
                      const v = Number(value)
                      return benchMetric === 'cost'
                        ? `$${v.toFixed(4)}`
                        : benchMetric === 'latency'
                          ? `${v}ms`
                          : v.toLocaleString()
                    }}
                  />
                  <Legend />
                  {[
                    ...new Set(data.benchmarkResults.map((r) => r.modelId)),
                  ].map((mid, i) => (
                    <Bar
                      key={mid}
                      dataKey={mid}
                      fill={BENCH_COLORS[i % BENCH_COLORS.length]}
                      name={mid}
                      radius={[2, 2, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Benchmark Turn-by-Turn Detail Chart */}
            {data.benchmarkResults.some((r) => r.turnsJson?.length > 0) && (
              <div className="mt-6 rounded-lg border border-gray-200 p-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">
                  시나리오별 턴별 토큰 추이
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ...new Set(data.benchmarkResults.map((r) => r.scenarioId)),
                  ].map((sid) => {
                    const scenarioResults = data.benchmarkResults.filter(
                      (r) => r.scenarioId === sid && r.turnsJson?.length > 0
                    )
                    if (scenarioResults.length === 0) return null
                    const scenarioName = scenarioResults[0].scenarioName
                    const maxTurns = Math.max(
                      ...scenarioResults.map((r) => r.turnsJson.length)
                    )
                    const chartData = Array.from(
                      { length: maxTurns },
                      (_, i) => {
                        const point: Record<string, string | number> = {
                          turn: `T${i + 1}`,
                        }
                        for (const r of scenarioResults) {
                          const t = r.turnsJson[i]
                          if (t) {
                            point[r.modelId] = t.inputTokens + t.outputTokens
                          }
                        }
                        return point
                      }
                    )
                    return (
                      <div key={sid}>
                        <p className="mb-2 text-xs font-medium text-gray-500">
                          {scenarioName}
                        </p>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#f3f4f6"
                            />
                            <XAxis dataKey="turn" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip />
                            {scenarioResults.map((r, i) => (
                              <Line
                                key={r.modelId}
                                type="monotone"
                                dataKey={r.modelId}
                                stroke={BENCH_COLORS[i % BENCH_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                name={r.modelId}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Benchmark Results History Table */}
            <div className="mt-6 rounded-lg border border-gray-200 p-5">
              <h3 className="mb-4 text-sm font-semibold text-gray-700">
                벤치마크 결과 이력 ({data.benchmarkResults.length}건)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500">
                      <th className="py-2 pr-3">시나리오</th>
                      <th className="py-2 pr-3">모델</th>
                      <th className="py-2 pr-3">Level</th>
                      <th className="py-2 pr-3 text-right">Input</th>
                      <th className="py-2 pr-3 text-right">Output</th>
                      <th className="py-2 pr-3 text-right">Total</th>
                      <th className="py-2 pr-3 text-right">Cost</th>
                      <th className="py-2 pr-3 text-right">Latency</th>
                      <th className="py-2 text-right">일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.benchmarkResults.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 text-gray-700"
                      >
                        <td className="py-2 pr-3">{r.scenarioName}</td>
                        <td className="py-2 pr-3">{r.modelId}</td>
                        <td className="py-2 pr-3">L{r.optimizationLevel}</td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {r.inputTokens.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {r.outputTokens.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {r.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">
                          ${r.costUsd.toFixed(4)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono">
                          {r.avgLatencyMs}ms
                        </td>
                        <td className="py-2 text-right text-gray-400">
                          {new Date(r.createdAt).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

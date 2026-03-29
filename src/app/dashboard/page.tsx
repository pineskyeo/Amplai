'use client'

import Link from 'next/link'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const RADAR_DATA = [
  { subject: '문맥성', value: 82, fullMark: 100 },
  { subject: '충실도', value: 90, fullMark: 100 },
  { subject: '관련성', value: 68, fullMark: 100 },
  { subject: '명확성', value: 81, fullMark: 100 },
  { subject: '일관성', value: 77, fullMark: 100 },
]

const LINE_DATA = [
  { name: 'Run 1', codex: 52, gemini: 65, claude: 88 },
  { name: 'Run 2', codex: 58, gemini: 68, claude: 91 },
  { name: 'Run 3', codex: 55, gemini: 70, claude: 95 },
  { name: 'Run 4', codex: 60, gemini: 72, claude: 98 },
  { name: 'Run 5', codex: 52, gemini: 70, claude: 100 },
]

const PIE_DATA = [
  { name: '통과', value: 55, color: '#22c55e' },
  { name: '실패', value: 45, color: '#e5e7eb' },
]

const QUALITY_LINE_DATA = [
  { name: 'Jan', faithfulness: 0.75, relevance: 0.62, precision: 0.8 },
  { name: 'Feb', faithfulness: 0.78, relevance: 0.65, precision: 0.82 },
  { name: 'Mar', faithfulness: 0.82, relevance: 0.68, precision: 0.9 },
]

interface MetricCardProps {
  label: string
  value: number
  grade: string
  delta: string
  positive: boolean
}

function MetricCard({ label, value, grade, delta, positive }: MetricCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-5">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">{value.toFixed(2)}</p>
        <div className="text-right">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              grade === '상'
                ? 'bg-green-50 text-green-700'
                : grade === '중'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-red-50 text-red-600'
            }`}
          >
            {grade}
          </span>
          <p
            className={`text-xs mt-1 ${positive ? 'text-green-600' : 'text-red-500'}`}
          >
            {positive ? '↑' : '↓'} {delta}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Amplai Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Evaluation Metrics — Quality Tracking
          </p>
        </div>
        <Link
          href="/"
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          ← Benchmark
        </Link>
      </div>

      <div className="px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="문맥성"
            value={0.82}
            grade="상"
            delta="0.04"
            positive={true}
          />
          <MetricCard
            label="답변 충실도"
            value={0.9}
            grade="상"
            delta="0.02"
            positive={true}
          />
          <MetricCard
            label="답변 관련성"
            value={0.68}
            grade="중"
            delta="0.03"
            positive={false}
          />
          <MetricCard
            label="답변의 명확성"
            value={0.81}
            grade="상"
            delta="0.01"
            positive={true}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* Radar Chart */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              적절 균형 (Quality Balance)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#111827"
                  fill="#111827"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart — Lint Score Trend */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              주문별 품질 추적 (Lint Score Trend)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={LINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[40, 110]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="codex"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="Codex"
                />
                <Line
                  type="monotone"
                  dataKey="gemini"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="Gemini"
                />
                <Line
                  type="monotone"
                  dataKey="claude"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="Claude"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              전체 룰 통과율
            </h3>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={PIE_DATA}
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {PIE_DATA.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div>
                <p className="text-4xl font-bold text-gray-900">55.0%</p>
                <p className="text-sm text-gray-500 mt-1">overall pass rate</p>
                <div className="mt-3 space-y-1">
                  {PIE_DATA.map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: d.color }}
                      />
                      <span className="text-xs text-gray-600">
                        {d.name} ({d.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quality Line Chart */}
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              음식점 + 일반관련성 추이
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={QUALITY_LINE_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0.5, 1.0]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="faithfulness"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="충실도"
                />
                <Line
                  type="monotone"
                  dataKey="relevance"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="관련성"
                />
                <Line
                  type="monotone"
                  dataKey="precision"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  dot={{ r: 3 }}
                  name="정밀도"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

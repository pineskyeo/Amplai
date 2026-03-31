'use client'

import { useState, useSyncExternalStore } from 'react'

interface Stats {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  turnCount: number
  avgTokensPerTurn: number
  usageByModel: Record<
    string,
    { input: number; output: number; cost: number; count: number }
  >
}

interface RecentUsage {
  inputTokens: number
  outputTokens: number
  model: string
  costUsd: number
  latencyMs: number
}

interface StatsData {
  stats: Stats
  recentUsage: RecentUsage[]
}

// External store for stats polling
let cachedData: StatsData | null = null
let listeners: Array<() => void> = []
let polling = false

function subscribe(listener: () => void) {
  listeners.push(listener)
  if (!polling) {
    polling = true
    const poll = () => {
      fetch('/api/chat/stats')
        .then((r) => r.json())
        .then((data: StatsData) => {
          cachedData = data
          for (const l of listeners) l()
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => {
      listeners = listeners.filter((l) => l !== listener)
      if (listeners.length === 0) {
        clearInterval(id)
        polling = false
      }
    }
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener)
    if (listeners.length === 0) {
      polling = false
    }
  }
}

function getSnapshot() {
  return cachedData
}

export default function TokenStatsBar() {
  const data = useSyncExternalStore(subscribe, getSnapshot, () => null)
  const [expanded, setExpanded] = useState(false)

  if (!data || data.stats.turnCount === 0) return null

  const { stats } = data
  const lastUsage =
    data.recentUsage.length > 0
      ? data.recentUsage[data.recentUsage.length - 1]
      : null

  return (
    <div className="border-t border-gray-100 bg-gray-50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-1.5 text-[10px] text-gray-400 hover:text-gray-600"
      >
        <span>
          {stats.turnCount} turns |{' '}
          {(stats.totalInputTokens + stats.totalOutputTokens).toLocaleString()}{' '}
          tokens | ${stats.totalCostUsd.toFixed(4)}
        </span>
        <span>
          {lastUsage && `last: ${lastUsage.model} ${lastUsage.latencyMs}ms`}
          {expanded ? ' ▲' : ' ▼'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 text-[11px] text-gray-500">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="font-medium text-gray-700">Input Tokens</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.totalInputTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Output Tokens</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.totalOutputTokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Total Cost</p>
              <p className="text-lg font-bold text-gray-900">
                ${stats.totalCostUsd.toFixed(4)}
              </p>
            </div>
          </div>

          {Object.keys(stats.usageByModel).length > 0 && (
            <div className="mt-3">
              <p className="mb-1 font-medium text-gray-700">Model Breakdown</p>
              {Object.entries(stats.usageByModel).map(([model, d]) => (
                <div
                  key={model}
                  className="flex items-center justify-between py-0.5"
                >
                  <span>
                    {model} ({d.count}x)
                  </span>
                  <span>
                    {(d.input + d.output).toLocaleString()} tokens | $
                    {d.cost.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 text-[10px] text-gray-400">
            Avg {Math.round(stats.avgTokensPerTurn).toLocaleString()}{' '}
            tokens/turn
          </div>
        </div>
      )}
    </div>
  )
}

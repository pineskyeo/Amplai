'use client'

import { useSyncExternalStore } from 'react'

interface Status {
  isRunning: boolean
  progress: string
  totalRuns: number
  completedRuns: number
}

let cachedStatus: Status | null = null
let listeners: Array<() => void> = []
let polling = false

function subscribe(listener: () => void) {
  listeners.push(listener)
  if (!polling) {
    polling = true
    const poll = () => {
      fetch('/api/benchmark-test/status')
        .then((r) => r.json())
        .then((data: Status) => {
          cachedStatus = data
          for (const l of listeners) l()
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
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
    if (listeners.length === 0) polling = false
  }
}

function getSnapshot() {
  return cachedStatus
}

export default function BenchmarkIndicator() {
  const status = useSyncExternalStore(subscribe, getSnapshot, () => null)

  if (!status?.isRunning) return null

  const pct =
    status.totalRuns > 0
      ? Math.round((status.completedRuns / status.totalRuns) * 100)
      : 0

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        <div>
          <p className="text-xs font-medium text-gray-900">Benchmark 실행 중</p>
          <p className="text-[10px] text-gray-500">{status.progress}</p>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-48 rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-gray-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

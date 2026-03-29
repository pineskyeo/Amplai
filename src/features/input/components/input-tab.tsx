'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Case } from '@/types'

const HARNESS_RULES = [
  'file-kebab-case',
  'no-list-detail-suffix',
  'no-interface-prefix',
  'suffix-naming',
  'array-prop-plural',
  'presenter-naming',
  'no-default-export-model',
  'no-direct-supabase',
  'layer-boundary',
]

interface Props {
  cases: Case[]
  onCasesChange: (cases: Case[]) => void
  onRun: (requirement: string, caseId: string) => Promise<void>
  isRunning: boolean
}

export default function InputTab({
  cases,
  onCasesChange,
  onRun,
  isRunning,
}: Props) {
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? '')
  const [selectedRules, setSelectedRules] = useState<string[]>(HARNESS_RULES)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadIdRef = useRef<string | null>(null)

  const selected = cases.find((c) => c.id === selectedId)
  const requirement =
    selected?.sourceType === 'audio'
      ? (selected.transcript ?? selected.prompt ?? '')
      : (selected?.prompt ?? '')

  function addCase() {
    const newId = `case_${Date.now()}`
    const newCase: Case = {
      id: newId,
      number: String(cases.length + 1).padStart(2, '0'),
      title: 'New Case',
      description: '',
      prompt: '',
      sourceType: 'text',
    }
    onCasesChange([...cases, newCase])
    setSelectedId(newId)
  }

  function deleteCase(id: string) {
    const remaining = cases.filter((c) => c.id !== id)
    onCasesChange(
      remaining.map((c, i) => ({
        ...c,
        number: String(i + 1).padStart(2, '0'),
      }))
    )
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? '')
  }

  function updateCase(id: string, updates: Partial<Case>) {
    onCasesChange(cases.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  async function handleAudioUpload(caseId: string, file: File) {
    setUploadingId(caseId)
    updateCase(caseId, {
      audioFileName: file.name,
      sourceType: 'audio',
      transcript: undefined,
    })

    const formData = new FormData()
    formData.append('audio', file)

    try {
      const res = await fetch('/api/stt', { method: 'POST', body: formData })
      const data = (await res.json()) as { transcript?: string; error?: string }
      if (data.transcript) {
        updateCase(caseId, { transcript: data.transcript })
      } else {
        updateCase(caseId, { audioFileName: undefined, sourceType: 'text' })
        alert(data.error ?? 'Transcription failed')
      }
    } catch {
      updateCase(caseId, { audioFileName: undefined, sourceType: 'text' })
    } finally {
      setUploadingId(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Use Cases</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-xl">
            요구사항을 정의하고 3개 AI Agent가 어떻게 구현하는지 벤치마크합니다.
            텍스트 브리프 또는 회의 녹음(STT)으로 입력할 수 있습니다.
          </p>
        </div>
        <button
          onClick={addCase}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors shrink-0"
        >
          + Add Case
        </button>
      </div>

      {/* Case Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cases.map((c, i) => (
          <div
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={cn(
              'border rounded-lg p-4 cursor-pointer transition-all group relative',
              selectedId === c.id
                ? 'border-gray-900 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gray-400">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-1.5">
                {c.sourceType === 'audio' && c.transcript && (
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                    STT
                  </span>
                )}
                {selectedId === c.id && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-900" />
                )}
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1 truncate">
              {c.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {c.sourceType === 'audio' && c.audioFileName
                ? `🎤 ${c.audioFileName}`
                : c.prompt || 'No requirement set'}
            </p>
            {cases.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteCase(c.id)
                }}
                className="absolute top-2 right-2 w-5 h-5 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 text-xs flex items-center justify-center transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Selected Case Editor */}
      {selected && (
        <div className="border border-gray-200 rounded-lg p-5 mb-8">
          {/* Title + Source toggle */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-mono text-gray-400 shrink-0">
                {selected.number}
              </span>
              <input
                value={selected.title}
                onChange={(e) =>
                  updateCase(selected.id, { title: e.target.value })
                }
                className="text-sm font-semibold text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-gray-400 focus:outline-none bg-transparent px-1 min-w-0 w-full"
                placeholder="Case title"
              />
            </div>
            <div className="flex rounded border border-gray-200 overflow-hidden text-xs shrink-0">
              <button
                onClick={() => updateCase(selected.id, { sourceType: 'text' })}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  selected.sourceType !== 'audio'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                Text Brief
              </button>
              <button
                onClick={() => updateCase(selected.id, { sourceType: 'audio' })}
                className={cn(
                  'px-3 py-1.5 font-medium transition-colors',
                  selected.sourceType === 'audio'
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                🎤 Audio STT
              </button>
            </div>
          </div>

          {selected.sourceType === 'audio' ? (
            <div className="space-y-3">
              {/* Upload zone */}
              <div
                onClick={() => {
                  pendingUploadIdRef.current = selected.id
                  fileInputRef.current?.click()
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files[0]
                  if (file) handleAudioUpload(selected.id, file)
                }}
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                  uploadingId === selected.id
                    ? 'border-yellow-300 bg-yellow-50'
                    : selected.audioFileName
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                )}
              >
                {uploadingId === selected.id ? (
                  <div>
                    <p className="text-sm font-medium text-yellow-700">
                      Transcribing with Whisper…
                    </p>
                    <p className="text-xs text-yellow-500 mt-1">
                      This may take a few seconds
                    </p>
                  </div>
                ) : selected.audioFileName ? (
                  <div>
                    <p className="text-sm font-medium text-blue-700">
                      🎤 {selected.audioFileName}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">
                      Drop audio file or click to upload
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      .mp3 .wav .ogg .webm .flac
                    </p>
                    <p className="text-xs text-gray-300 mt-2">
                      Requires GOOGLE_CLOUD_STT_API_KEY in .env.local
                    </p>
                  </div>
                )}
              </div>

              {/* Transcript editor */}
              {selected.transcript ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">
                    Transcript{' '}
                    <span className="text-blue-400">
                      (editable — fix STT errors)
                    </span>
                  </label>
                  <textarea
                    value={selected.transcript}
                    onChange={(e) =>
                      updateCase(selected.id, { transcript: e.target.value })
                    }
                    rows={6}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-xs font-mono text-gray-700 focus:outline-none focus:border-gray-400 resize-none"
                  />
                </div>
              ) : (
                !uploadingId && (
                  <p className="text-xs text-gray-400 italic">
                    Upload an audio file to generate a transcript, or switch to
                    Text Brief.
                  </p>
                )
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Requirement / Brief
              </label>
              <textarea
                value={selected.prompt}
                onChange={(e) =>
                  updateCase(selected.id, { prompt: e.target.value })
                }
                rows={4}
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-800 focus:outline-none focus:border-gray-400 resize-none"
                placeholder={
                  'e.g. "DIO이츠 고객 앱 만들어줘"\nor paste a detailed brief…'
                }
              />
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.webm,.flac,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/flac"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          const id = pendingUploadIdRef.current
          if (file && id) handleAudioUpload(id, file)
          e.target.value = ''
          pendingUploadIdRef.current = null
        }}
      />

      {/* Harness Rules */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Harness Rules — {selectedRules.length}/{HARNESS_RULES.length} active
        </h3>
        <div className="flex flex-wrap gap-2">
          {HARNESS_RULES.map((rule) => (
            <button
              key={rule}
              onClick={() =>
                setSelectedRules((prev) =>
                  prev.includes(rule)
                    ? prev.filter((r) => r !== rule)
                    : [...prev, rule]
                )
              }
              className={cn(
                'px-2.5 py-1 rounded text-xs font-mono transition-colors border',
                selectedRules.includes(rule)
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
              )}
            >
              {rule}
            </button>
          ))}
        </div>
      </div>

      {/* Run */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (selected && requirement.trim())
              onRun(requirement.trim(), selected.id)
          }}
          disabled={isRunning || !requirement.trim()}
          className={cn(
            'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
            isRunning || !requirement.trim()
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-gray-700'
          )}
        >
          {isRunning ? 'Running…' : 'Run Benchmark'}
        </button>
        {selected && (
          <span className="text-xs text-gray-400">
            {selected.title}
            {selected.sourceType === 'audio' && selected.transcript
              ? ' · STT transcript'
              : ' · text brief'}
          </span>
        )}
      </div>
    </div>
  )
}

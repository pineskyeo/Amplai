export type AIModel = 'claude' | 'gemini' | 'codex'

export type StepStatus = 'idle' | 'loading' | 'done' | 'error'

export type TabId =
  | '01-input'
  | '02-plan'
  | '03-design'
  | '04-code'
  | '05-lint'
  | '06-normal-form'

export type PlanSubTab = 'meeting-log' | 'cps' | 'prd'

export type DesignSubTab =
  | 'spec'
  | 'blueprint'
  | 'domain-model'
  | 'architecture'

export type CodeSubTab = 'real' | 'mock'

export interface Case {
  id: string
  number: string
  title: string
  description: string
  prompt: string
  sourceType?: 'text' | 'audio'
  transcript?: string
  audioFileName?: string
}

export interface AgentResult {
  model: AIModel
  content: string
  status: StepStatus
  duration?: number
  fileCount?: number
  lineCount?: number
}

export interface BenchmarkRun {
  id: string
  caseId: string
  results: Record<AIModel, AgentResult>
  createdAt: string
}

export interface LintRule {
  id: string
  name: string
  description: string
}

export interface LintScore {
  model: AIModel
  score: number
  rules: Record<string, 'pass' | 'fail'>
}

export interface EvaluationMetric {
  faithfulness: number
  relevance: number
  precision: number
  recall: number
}

export interface Project {
  id: string
  name: string
  createdAt: string
}

export interface Document {
  id: string
  projectId: string
  type:
    | 'meeting_log'
    | 'cps'
    | 'prd'
    | 'spec'
    | 'blueprint'
    | 'domain_model'
    | 'architecture'
  content: string
  aiModel: AIModel
  createdAt: string
}

export interface GeneratedCode {
  id: string
  projectId: string
  aiModel: AIModel
  files: Record<string, string>
  status: 'pending' | 'done' | 'error'
  duration: number
  createdAt: string
}

export interface LintResult {
  id: string
  codeId: string
  aiModel: AIModel
  score: number
  details: Record<string, 'pass' | 'fail'>
  createdAt: string
}

export interface ExportDocument {
  id: string
  projectId: string
  type: 'pdf'
  url: string
  createdAt: string
}

export interface LintViolation {
  rule: string
  message: string
  file: string
}

export interface GeneratedFile {
  path: string
  content: string
}

export interface AgentBenchmarkResult {
  files: GeneratedFile[]
  violations: LintViolation[]
  score: number
  ruleResults: Record<string, 'pass' | 'fail'>
  generationMs: number
}

export interface BenchmarkResult {
  runId: string
  requirement: string
  claude: AgentBenchmarkResult
  gemini: AgentBenchmarkResult
  codex: AgentBenchmarkResult
}

export interface PlanResult {
  meetingLog: string
  cps: string
  prd: string
}

export interface PlanBenchmarkResult {
  runId: string
  requirement: string
  claude: PlanResult
  gemini: PlanResult
  codex: PlanResult
}

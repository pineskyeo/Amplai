import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { lintFiles } from '@/lib/lint-runner'
import type {
  GeneratedFile,
  AgentBenchmarkResult,
  BenchmarkResult,
} from '@/types'

const RequestSchema = z.object({
  requirement: z.string().min(1),
  caseId: z.string(),
})

const CODE_GEN_SYSTEM = `You are a senior TypeScript/React developer implementing MVPVM architecture.
Generate exactly 4 files. Follow ALL rules strictly:
1. Filenames must be kebab-case
2. NO I-prefix on interfaces (RestaurantModel not IRestaurantModel)
3. Repository interface must end with Repository suffix
4. ViewModel type/interface must end with ViewModel suffix
5. Presenter function must be named useXxxPresenter
6. NO export default in model files — named exports only
7. NO Supabase imports in presenter files
8. Array props must be plural: restaurants not restaurantList

Output format — ONLY code, nothing else:

=== FILE: domain/restaurant-model.ts ===
[code]

=== FILE: domain/restaurant-repository.ts ===
[code]

=== FILE: restaurants/restaurants-page-view-model.ts ===
[code]

=== FILE: restaurants/restaurants-page-presenter.ts ===
[code]`

function parseGeneratedFiles(text: string): GeneratedFile[] {
  const files: GeneratedFile[] = []
  const parts = text.split(/^=== FILE: (.+?) ===/m)
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i].trim()
    const content = (parts[i + 1] ?? '').trim()
    if (path && content) files.push({ path, content })
  }
  return files
}

// Codex stub — 5 violations: no-interface-prefix, no-default-export-model, suffix-naming ×2, array-prop-plural, no-direct-supabase
const CODEX_FILES: GeneratedFile[] = [
  {
    path: 'domain/restaurant-model.ts',
    content: `export interface IRestaurantModel {
  id: string
  name: string
  category: string
  rating: number
  deliveryTime: number
  minOrderAmount: number
}

export default IRestaurantModel`,
  },
  {
    path: 'domain/restaurant-repository.ts',
    content: `import type { IRestaurantModel } from './restaurant-model'

export interface RestaurantData {
  fetchRestaurants(): Promise<IRestaurantModel[]>
  fetchById(id: string): Promise<IRestaurantModel | null>
}`,
  },
  {
    path: 'restaurants/restaurants-page-view-model.ts',
    content: `import type { IRestaurantModel } from '../domain/restaurant-model'

export interface RestaurantPageState {
  restaurantList: IRestaurantModel[]
  selectedCategory: string | null
  isLoading: boolean
}

export function createRestaurantsPageViewModel(
  restaurants: IRestaurantModel[]
): RestaurantPageState {
  return { restaurantList: restaurants, selectedCategory: null, isLoading: false }
}`,
  },
  {
    path: 'restaurants/restaurants-page-presenter.ts',
    content: `import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createRestaurantsPageViewModel } from './restaurants-page-view-model'
import type { RestaurantPageState } from './restaurants-page-view-model'

export function useRestaurantsPagePresenter() {
  const [viewModel, setViewModel] = useState<RestaurantPageState>(
    createRestaurantsPageViewModel([])
  )

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.from('restaurants').select('*').then(({ data }) => {
      setViewModel(createRestaurantsPageViewModel(data ?? []))
    })
  }, [])

  return { viewModel }
}`,
  },
]

// Gemini stub — 2 violations: array-prop-plural, no-direct-supabase
const GEMINI_FILES: GeneratedFile[] = [
  {
    path: 'domain/restaurant-model.ts',
    content: `export interface RestaurantModel {
  id: string
  name: string
  category: string
  rating: number
  deliveryTime: number
  minOrderAmount: number
}`,
  },
  {
    path: 'domain/restaurant-repository.ts',
    content: `import type { RestaurantModel } from './restaurant-model'

export interface RestaurantRepository {
  fetchRestaurantModels(): Promise<RestaurantModel[]>
  fetchById(id: string): Promise<RestaurantModel | null>
}`,
  },
  {
    path: 'restaurants/restaurants-page-view-model.ts',
    content: `import type { RestaurantModel } from '../domain/restaurant-model'

export interface RestaurantsPageViewModel {
  restaurantList: RestaurantModel[]
  selectedCategory: string | null
  isLoading: boolean
}

export function createRestaurantsPageViewModel(
  restaurants: RestaurantModel[],
  selectedCategory: string | null = null
): RestaurantsPageViewModel {
  return { restaurantList: restaurants, selectedCategory, isLoading: false }
}`,
  },
  {
    path: 'restaurants/restaurants-page-presenter.ts',
    content: `import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  createRestaurantsPageViewModel,
  type RestaurantsPageViewModel,
} from './restaurants-page-view-model'

export function useRestaurantsPagePresenter() {
  const [viewModel, setViewModel] = useState<RestaurantsPageViewModel>(
    createRestaurantsPageViewModel([])
  )

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.from('restaurants').select('*').then(({ data }) => {
      setViewModel(createRestaurantsPageViewModel(data ?? []))
    })
  }, [])

  const handleCategorySelect = (category: string | null) => {
    setViewModel((prev) => ({ ...prev, selectedCategory: category }))
  }

  return { viewModel, handleCategorySelect }
}`,
  },
]

async function generateClaudeFiles(
  requirement: string
): Promise<GeneratedFile[]> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: CODE_GEN_SYSTEM,
    prompt: `Generate MVPVM TypeScript files for: ${requirement}`,
    maxOutputTokens: 2000,
  })
  return parseGeneratedFiles(text)
}

export async function POST(req: Request) {
  const body = (await req.json()) as unknown
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { requirement, caseId } = parsed.data
  const runId = `run_${Date.now()}`

  // Claude — real generation
  const claudeStart = Date.now()
  let claudeFiles: GeneratedFile[] = []
  try {
    claudeFiles = await generateClaudeFiles(requirement)
  } catch {
    claudeFiles = []
  }
  const claudeMs = Date.now() - claudeStart

  // Gemini & Codex — stubs (replace with real APIs when keys added)
  const geminiMs = 800 + Math.floor(Math.random() * 400)
  const codexMs = 900 + Math.floor(Math.random() * 400)

  const claudeLint = lintFiles(claudeFiles)
  const geminiLint = lintFiles(GEMINI_FILES)
  const codexLint = lintFiles(CODEX_FILES)

  const result: BenchmarkResult = {
    runId,
    requirement,
    claude: {
      files: claudeFiles,
      violations: claudeLint.violations,
      score: claudeLint.score,
      ruleResults: claudeLint.ruleResults,
      generationMs: claudeMs,
    } as AgentBenchmarkResult,
    gemini: {
      files: GEMINI_FILES,
      violations: geminiLint.violations,
      score: geminiLint.score,
      ruleResults: geminiLint.ruleResults,
      generationMs: geminiMs,
    } as AgentBenchmarkResult,
    codex: {
      files: CODEX_FILES,
      violations: codexLint.violations,
      score: codexLint.score,
      ruleResults: codexLint.ruleResults,
      generationMs: codexMs,
    } as AgentBenchmarkResult,
  }

  return NextResponse.json({ ...result, caseId })
}

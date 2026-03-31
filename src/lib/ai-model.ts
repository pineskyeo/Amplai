// AI model selector — switch between providers
// Supports runtime selection via modelId parameter

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'

export interface ModelOption {
  id: string
  name: string
  provider: string
  cost: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    cost: 'Free',
  },
  { id: 'gemini-pro', name: 'Gemini 2.5 Pro', provider: 'Google', cost: 'Low' },
  { id: 'deepseek', name: 'DeepSeek V3', provider: 'DeepSeek', cost: 'Low' },
  { id: 'haiku', name: 'Claude Haiku 3.5', provider: 'Anthropic', cost: 'Low' },
  {
    id: 'openrouter-free',
    name: 'Gemini Flash (Free)',
    provider: 'OpenRouter',
    cost: 'Free',
  },
  {
    id: 'sonnet',
    name: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    cost: 'High',
  },
]

export const DEFAULT_MODEL_ID = 'gemini-flash'

export function getChatModel(modelId?: string) {
  const id = modelId ?? process.env.AI_MODEL ?? DEFAULT_MODEL_ID

  switch (id) {
    case 'gemini-flash':
      return google('gemini-2.0-flash')

    case 'gemini-pro':
      return google('gemini-2.5-pro-preview-06-05')

    case 'deepseek': {
      const deepseek = createOpenAI({
        baseURL: 'https://api.deepseek.com/v1',
        apiKey: process.env.DEEPSEEK_API_KEY,
      })
      return deepseek('deepseek-chat')
    }

    case 'haiku':
      return anthropic('claude-haiku-4-5-20251001')

    case 'openrouter-free': {
      const openrouter = createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      })
      return openrouter('google/gemini-2.0-flash-exp:free')
    }

    case 'sonnet':
      return anthropic('claude-sonnet-4-6')

    default:
      return google('gemini-2.0-flash')
  }
}

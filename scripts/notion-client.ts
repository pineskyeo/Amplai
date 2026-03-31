// Notion REST API client — no MCP dependency
// Direct API calls for harness-level automation

import { config } from 'dotenv'
config({ path: '.env.local' })

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

function getApiKey(): string {
  const key = process.env.NOTION_API_KEY
  if (!key) {
    throw new Error('NOTION_API_KEY is not set in .env.local')
  }
  return key
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// --- Create ---

interface CreatePageParams {
  databaseId: string
  properties: Record<string, unknown>
  content?: NotionBlock[]
}

export async function createPage(
  params: CreatePageParams
): Promise<{ id: string; url: string }> {
  const body: Record<string, unknown> = {
    parent: { database_id: params.databaseId },
    properties: params.properties,
  }

  if (params.content) {
    body.children = params.content
  }

  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion create failed: ${res.status} ${err}`)
  }

  const data = (await res.json()) as { id: string; url: string }
  return { id: data.id, url: data.url }
}

// --- Update ---

export async function updatePage(
  pageId: string,
  properties: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ properties }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion update failed: ${res.status} ${err}`)
  }
}

// --- Append content to page ---

export async function appendBlocks(
  pageId: string,
  blocks: NotionBlock[]
): Promise<void> {
  const res = await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ children: blocks }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion append failed: ${res.status} ${err}`)
  }
}

// --- Query database ---

interface QueryParams {
  databaseId: string
  filter?: Record<string, unknown>
  sorts?: Array<Record<string, unknown>>
  pageSize?: number
}

export async function queryDatabase(
  params: QueryParams
): Promise<Array<{ id: string; properties: Record<string, unknown> }>> {
  const body: Record<string, unknown> = {}
  if (params.filter) body.filter = params.filter
  if (params.sorts) body.sorts = params.sorts
  if (params.pageSize) body.page_size = params.pageSize

  const res = await fetch(
    `${NOTION_API}/databases/${params.databaseId}/query`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion query failed: ${res.status} ${err}`)
  }

  const data = (await res.json()) as {
    results: Array<{ id: string; properties: Record<string, unknown> }>
  }
  return data.results
}

// --- Archive (soft delete) ---

export async function archivePage(pageId: string): Promise<void> {
  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ archived: true }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion archive failed: ${res.status} ${err}`)
  }
}

// --- Block builders ---

export type NotionBlock = Record<string, unknown>

export function heading2(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

export function heading3(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

export function paragraph(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

export function bulletItem(text: string): NotionBlock {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  }
}

export function codeBlock(code: string, language = 'plain text'): NotionBlock {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{ type: 'text', text: { content: code } }],
      language,
    },
  }
}

export function divider(): NotionBlock {
  return { object: 'block', type: 'divider', divider: {} }
}

// --- Property builders ---

export function titleProp(text: string): Record<string, unknown> {
  return { title: [{ text: { content: text } }] }
}

export function richTextProp(text: string): Record<string, unknown> {
  return { rich_text: [{ text: { content: text } }] }
}

export function selectProp(name: string): Record<string, unknown> {
  return { select: { name } }
}

export function multiSelectProp(names: string[]): Record<string, unknown> {
  return { multi_select: names.map((name) => ({ name })) }
}

export function dateProp(date: string): Record<string, unknown> {
  return { date: { start: date } }
}

export function checkboxProp(checked: boolean): Record<string, unknown> {
  return { checkbox: checked }
}

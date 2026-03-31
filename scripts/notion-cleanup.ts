/* eslint-disable no-console */
// Notion 정리 스크립트 — 중복 병합, 빈 페이지 삭제, 태그 통일
// Usage: pnpm notion:cleanup
// Usage: pnpm notion:cleanup -- --dry-run (미리보기만)

import {
  queryDatabase,
  archivePage,
  updatePage,
  multiSelectProp,
} from './notion-client.js'
import { NOTION_DBS } from './config.js'

const isDryRun = process.argv.includes('--dry-run')

function log(action: string, detail: string): void {
  const prefix = isDryRun ? '[DRY RUN]' : '[CLEANUP]'
  console.log(`${prefix} ${action}: ${detail}`)
}

// --- 1. Find empty pages (no content, only properties) ---

async function findEmptyPages(): Promise<void> {
  console.log('\n--- 빈 페이지 검색 ---')

  for (const [dbName, dbId] of Object.entries(NOTION_DBS)) {
    const pages = await queryDatabase({ databaseId: dbId })

    for (const page of pages) {
      const titleProp = page.properties['제목'] as {
        title?: Array<{ plain_text: string }>
      }
      const title = titleProp?.title?.[0]?.plain_text ?? '(제목 없음)'

      // Check if 결정사항 and 다음 액션 are empty (미팅로그)
      if (dbName === '미팅로그') {
        const 결정 = page.properties['결정사항'] as {
          rich_text?: Array<{ plain_text: string }>
        }
        const 액션 = page.properties['다음 액션'] as {
          rich_text?: Array<{ plain_text: string }>
        }
        const isEmpty =
          (!결정?.rich_text?.length || 결정.rich_text[0].plain_text === '') &&
          (!액션?.rich_text?.length || 액션.rich_text[0].plain_text === '')

        if (isEmpty) {
          log('빈 미팅로그', `"${title}" (${page.id})`)
          if (!isDryRun) {
            await archivePage(page.id)
          }
        }
      }
    }
  }
}

// --- 2. Find duplicate titles ---

async function findDuplicates(): Promise<void> {
  console.log('\n--- 중복 제목 검색 ---')

  for (const [dbName, dbId] of Object.entries(NOTION_DBS)) {
    const pages = await queryDatabase({ databaseId: dbId })
    const titleMap = new Map<string, Array<{ id: string; title: string }>>()

    for (const page of pages) {
      const titleProp = page.properties['제목'] as {
        title?: Array<{ plain_text: string }>
      }
      const title = titleProp?.title?.[0]?.plain_text ?? ''
      if (!title) continue

      // Normalize: remove date prefix for comparison
      const normalized = title.replace(/^\[[\d-]+\]\s*/, '').toLowerCase()

      if (!titleMap.has(normalized)) {
        titleMap.set(normalized, [])
      }
      titleMap.get(normalized)!.push({ id: page.id, title })
    }

    for (const [normalized, entries] of titleMap) {
      if (entries.length > 1) {
        log(`중복 발견 (${dbName})`, `"${normalized}" × ${entries.length}개`)
        for (const entry of entries) {
          console.log(`  - ${entry.title} (${entry.id})`)
        }
      }
    }
  }
}

// --- 3. Tag normalization (학습노트) ---

const TAG_NORMALIZATIONS: Record<string, string> = {
  'ai-native': 'AI-Native',
  'ai native': 'AI-Native',
  ainative: 'AI-Native',
  하네스: '하네스 엔지니어링',
  harness: '하네스 엔지니어링',
  awaken: 'Awaken',
  amplai: 'Amplai',
  llm: 'LLM',
  claude: 'Claude',
}

async function normalizeTags(): Promise<void> {
  console.log('\n--- 태그 정규화 ---')

  const pages = await queryDatabase({ databaseId: NOTION_DBS.학습노트 })

  for (const page of pages) {
    const tagProp = page.properties['태그'] as {
      multi_select?: Array<{ name: string }>
    }
    const tags = tagProp?.multi_select?.map((t) => t.name) ?? []
    if (tags.length === 0) continue

    let changed = false
    const normalizedTags = tags.map((tag) => {
      const lower = tag.toLowerCase()
      if (TAG_NORMALIZATIONS[lower] && TAG_NORMALIZATIONS[lower] !== tag) {
        changed = true
        return TAG_NORMALIZATIONS[lower]
      }
      return tag
    })

    if (changed) {
      const titleProp = page.properties['제목'] as {
        title?: Array<{ plain_text: string }>
      }
      const title = titleProp?.title?.[0]?.plain_text ?? ''
      log(
        '태그 수정',
        `"${title}": [${tags.join(', ')}] → [${normalizedTags.join(', ')}]`
      )

      if (!isDryRun) {
        await updatePage(page.id, {
          태그: multiSelectProp(normalizedTags),
        })
      }
    }
  }
}

// --- Main ---

async function main(): Promise<void> {
  if (isDryRun) {
    console.log('=== DRY RUN MODE (변경 없음, 미리보기만) ===')
  }

  await findEmptyPages()
  await findDuplicates()
  await normalizeTags()

  console.log('\n✓ 정리 완료')
}

main().catch((err: unknown) => {
  console.error('✗ 정리 실패:', err)
  process.exit(1)
})

/* eslint-disable no-console */
// 대화 요약 → Notion 기록
// Triggered by: /log 스킬 또는 수동 실행
// Usage: pnpm notion:log -- --type 미팅로그 --project Amplai --title "주제" --content "내용"

import {
  createPage,
  appendBlocks,
  queryDatabase,
  titleProp,
  richTextProp,
  selectProp,
  multiSelectProp,
  dateProp,
  checkboxProp,
  heading2,
  heading3,
  paragraph,
  bulletItem,
  divider,
  type NotionBlock,
} from './notion-client.js'
import {
  NOTION_DBS,
  type Project,
  type 학습카테고리,
  type 학습태그,
} from './config.js'

// --- CLI argument parsing ---

interface LogArgs {
  type: '미팅로그' | '학습노트' | '아이디어'
  project: Project
  title: string
  content: string
  category?: 학습카테고리
  tags?: 학습태그[]
  // For appending to existing topic page
  appendTo?: string // page ID
}

function parseArgs(): LogArgs {
  const args = process.argv.slice(2).filter((a) => a !== '--')
  const parsed: Record<string, string> = {}

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '')
    parsed[key] = args[i + 1]
  }

  return {
    type: (parsed.type as LogArgs['type']) ?? '미팅로그',
    project: (parsed.project as Project) ?? '공통',
    title: parsed.title ?? `[${today()}] 기록`,
    content: parsed.content ?? '',
    category: parsed.category as 학습카테고리 | undefined,
    tags: parsed.tags ? (parsed.tags.split(',') as 학습태그[]) : undefined,
    appendTo: parsed.appendTo,
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function contentToBlocks(content: string): NotionBlock[] {
  const blocks: NotionBlock[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    if (line.startsWith('## ')) {
      blocks.push(heading2(line.slice(3)))
    } else if (line.startsWith('### ')) {
      blocks.push(heading3(line.slice(4)))
    } else if (line.startsWith('- ')) {
      blocks.push(bulletItem(line.slice(2)))
    } else if (line === '---') {
      blocks.push(divider())
    } else if (line.trim()) {
      blocks.push(paragraph(line))
    }
  }

  return blocks
}

// --- Create new page ---

async function createMeetingLog(args: LogArgs): Promise<string> {
  const result = await createPage({
    databaseId: NOTION_DBS.미팅로그,
    properties: {
      제목: titleProp(args.title),
      날짜: dateProp(today()),
      참여자: richTextProp('pinesky, Claude'),
      프로젝트: selectProp(args.project),
      결정사항: richTextProp(''),
      '다음 액션': richTextProp(''),
    },
    content: contentToBlocks(args.content),
  })
  return result.url
}

async function createStudyNote(args: LogArgs): Promise<string> {
  const result = await createPage({
    databaseId: NOTION_DBS.학습노트,
    properties: {
      제목: titleProp(args.title),
      날짜: dateProp(today()),
      카테고리: selectProp(args.category ?? '기술'),
      프로젝트: selectProp(args.project),
      태그: args.tags ? multiSelectProp(args.tags) : multiSelectProp([]),
      'Velog 발행': checkboxProp(false),
    },
    content: contentToBlocks(args.content),
  })
  return result.url
}

async function createIdea(args: LogArgs): Promise<string> {
  const result = await createPage({
    databaseId: NOTION_DBS.아이디어,
    properties: {
      제목: titleProp(args.title),
      프로젝트: selectProp(args.project),
      상태: selectProp('브레인스토밍'),
    },
    content: contentToBlocks(args.content),
  })
  return result.url
}

// --- Append to existing page (주제 누적) ---

async function appendToPage(pageId: string, content: string): Promise<void> {
  const blocks = [divider(), heading3(today()), ...contentToBlocks(content)]
  await appendBlocks(pageId, blocks)
}

// --- Find existing page by title ---

export async function findPageByTitle(
  dbKey: keyof typeof NOTION_DBS,
  titleQuery: string
): Promise<{ id: string; title: string } | null> {
  const results = await queryDatabase({
    databaseId: NOTION_DBS[dbKey],
    filter: {
      property: '제목',
      title: { contains: titleQuery },
    },
    pageSize: 1,
  })

  if (results.length === 0) return null

  const page = results[0]
  const titlePropValue = page.properties['제목'] as {
    title?: Array<{ plain_text: string }>
  }
  const title = titlePropValue?.title?.[0]?.plain_text ?? ''

  return { id: page.id, title }
}

// --- Main ---

async function main(): Promise<void> {
  const args = parseArgs()

  // If appendTo is specified, append to existing page
  if (args.appendTo) {
    await appendToPage(args.appendTo, args.content)
    console.log(`✓ 기존 페이지에 추가 완료: ${args.appendTo}`)
    return
  }

  let url: string

  switch (args.type) {
    case '미팅로그':
      url = await createMeetingLog(args)
      break
    case '학습노트':
      url = await createStudyNote(args)
      break
    case '아이디어':
      url = await createIdea(args)
      break
  }

  console.log(`✓ Notion ${args.type} 생성: ${url}`)
}

main().catch((err: unknown) => {
  console.error('✗ Notion 기록 실패:', err)
  process.exit(1)
})

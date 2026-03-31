/* eslint-disable no-console */
// Git commit → Notion 미팅로그 자동 기록
// Triggered by: husky post-commit hook
// Usage: pnpm notion:commit

import { execSync } from 'node:child_process'

import {
  createPage,
  titleProp,
  richTextProp,
  selectProp,
  dateProp,
  heading2,
  bulletItem,
  codeBlock,
  divider,
} from './notion-client.js'
import { NOTION_DBS } from './config.js'

function getLatestCommit(): {
  hash: string
  message: string
  files: string[]
  diff: string
} {
  const hash = execSync('git log -1 --format=%h').toString().trim()
  const message = execSync('git log -1 --format=%s').toString().trim()
  const files = execSync('git log -1 --name-only --format=""')
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean)
  const diff = execSync('git log -1 --stat --format=""').toString().trim()

  return { hash, message, files, diff }
}

function detectProject(files: string[]): string {
  // Simple heuristic based on file paths
  const hasAmplai = files.some(
    (f) =>
      f.startsWith('src/') || f.startsWith('scripts/') || f.includes('amplai')
  )
  if (hasAmplai) return 'Amplai'
  return '공통'
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

async function main(): Promise<void> {
  const commit = getLatestCommit()
  const project = detectProject(commit.files)
  const date = today()

  const title = `[${date}] ${commit.message}`

  const result = await createPage({
    databaseId: NOTION_DBS.미팅로그,
    properties: {
      제목: titleProp(title),
      날짜: dateProp(date),
      참여자: richTextProp('pinesky, Claude'),
      프로젝트: selectProp(project),
      결정사항: richTextProp(commit.message),
      '다음 액션': richTextProp(''),
    },
    content: [
      heading2('커밋 정보'),
      bulletItem(`해시: ${commit.hash}`),
      bulletItem(`메시지: ${commit.message}`),
      divider(),
      heading2('변경 파일'),
      ...commit.files.map((f) => bulletItem(f)),
      divider(),
      heading2('변경 통계'),
      codeBlock(commit.diff),
    ],
  })

  console.log(`✓ Notion 미팅로그 생성: ${result.url}`)
}

main().catch((err: unknown) => {
  console.error('✗ Notion 기록 실패:', err)
  // Don't exit(1) — commit should not fail because of Notion
})

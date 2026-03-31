// Notion DB IDs and routing rules — harness configuration
// All IDs extracted from actual Notion workspace

export const NOTION_DBS = {
  미팅로그: 'b4482fc9-da9d-490c-941e-c5453e407826',
  학습노트: 'a7a077c4-e8d3-49bb-8f04-a8a55332590f',
  아이디어: '51d769ca-346a-496c-ae31-be9dccbd60c3',
} as const

export const NOTION_PAGES = {
  hub: '332cbabe-a3b3-81e3-b00f-fd05ff6ccb68',
} as const

export type Project = 'Amplai' | 'Awaken' | '공통'
export type 학습카테고리 = '기술' | '영어' | '알고리즘' | '아키텍처' | '여정'
export type 학습태그 =
  | 'AI-Native'
  | '하네스 엔지니어링'
  | 'Awaken'
  | 'Amplai'
  | 'LLM'
  | 'Claude'
export type 아이디어상태 = '브레인스토밍' | '검토중' | '채택' | '보류'

// Routing rules: what goes where
export const ROUTING_RULES = {
  '프로젝트 논의/의사결정': '미팅로그',
  '기술 학습': '학습노트',
  '영어 학습': '학습노트',
  '알고리즘 학습': '학습노트',
  '아이디어/브레인스토밍': '아이디어',
  '코드 변경': '미팅로그', // commit info → 미팅로그 with 변경 요약
} as const

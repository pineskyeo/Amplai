# Amplai

## 프로젝트 개요
AI 요구사항 입력 → 문서 자동생성 → 코드 자동생성 → 린트 채점 → 결과 대시보드 → PDF 내보내기

하네스 엔지니어링(Harness Engineering) 플랫폼.
Claude / Gemini / Codex 3개 모델이 동일한 요구사항을 받아 코드를 생성하고,
ESLint 하네스가 모든 출력을 동일한 구조적 Normal Form으로 수렴시키는지 검증한다.

---

## 기술 스택
- Frontend: Next.js 16, TypeScript (strict), Tailwind CSS
- Backend/DB: Supabase
- AI: Claude API (Anthropic), Gemini API (Google), OpenAI API
- AI SDK: Vercel AI SDK (`ai`, `@ai-sdk/*`)
- 검증: Zod (모든 AI 응답, 외부 입력)
- PDF: Puppeteer (HTML → PDF)
- 패키지 매니저: pnpm (npm/yarn 절대 금지)

---

## 아키텍처 — MVPVM

모든 기능은 MVPVM 레이어로 분리한다.

```
Model       → 순수 타입/인터페이스. 로직 없음.
Repository  → 데이터 접근 추상화 (인터페이스만, 구현은 infrastructure에)
ViewModel   → 도메인 데이터를 UI 상태로 변환하는 순수 함수
Presenter   → 비즈니스 로직 훅 (useXxxPresenter). 상태 관리, Repository 호출.
View        → React 컴포넌트. 렌더링만. 로직 없음.
```

### 레이어 의존성 규칙 (위반 시 ESLint 오류)

```
View        → Presenter만 호출 가능
Presenter   → Repository 인터페이스 + ViewModel만 사용
ViewModel   → Model 타입만 사용 (순수 함수)
Repository  → Model 타입만 사용 (인터페이스)
Infrastructure → Repository 인터페이스 구현 (Supabase 등)

금지:
  View에서 직접 supabase 호출       ❌
  View에서 직접 fetch 호출           ❌
  Domain에서 Infrastructure import  ❌
  Presenter에서 직접 supabase 호출  ❌
```

---

## 폴더 구조

```
src/
├── app/
│   ├── api/                        # Next.js API routes
│   │   └── benchmark/route.ts
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   ├── input/
│   │   ├── components/             # View 컴포넌트
│   │   ├── api.ts                  # AI API 호출 (features 외부 노출 금지)
│   │   └── repository.ts           # DB 접근 (supabase)
│   ├── plan/
│   │   ├── components/
│   │   ├── api.ts
│   │   └── repository.ts
│   ├── design/
│   │   ├── components/
│   │   ├── api.ts
│   │   └── repository.ts
│   ├── code/
│   │   ├── components/
│   │   ├── api.ts
│   │   └── repository.ts
│   ├── lint/
│   │   ├── components/
│   │   ├── api.ts
│   │   └── repository.ts
│   ├── evaluation/
│   │   ├── components/
│   │   ├── api.ts
│   │   └── repository.ts
│   └── export/
│       ├── components/
│       ├── api.ts
│       └── pdf.ts
├── components/
│   └── ui/                         # 공통 UI 컴포넌트
├── lib/
│   ├── supabase.ts                 # Supabase 클라이언트 (여기서만)
│   └── utils.ts                    # cn() 등 유틸
└── types/
    └── index.ts                    # 공통 타입
```

---

## 파일 네이밍 규칙 (하네스 핵심)

| 레이어 | 패턴 | 예시 |
|--------|------|------|
| Model | `{domain}-model.ts` | `restaurant-model.ts` |
| Repository 인터페이스 | `{domain}-repository.ts` | `restaurant-repository.ts` |
| Repository 구현체 | `{domain}-repository-supabase.ts` | `restaurant-repository-supabase.ts` |
| Presenter | `{page}-presenter.ts` | `restaurants-page-presenter.ts` |
| ViewModel | `{page}-view-model.ts` | `restaurants-page-view-model.ts` |
| View (페이지) | `{page}-page.tsx` | `restaurants-page.tsx` |
| View (컴포넌트) | `{name}.tsx` | `restaurant-card.tsx` |

**규칙:**
- 모든 파일명: `kebab-case`
- 목록 페이지: 반드시 복수형 (`restaurants` not `restaurant-list`)
- `list`, `detail` suffix 파일명 금지
- 각 디렉토리에 `index.ts` barrel 파일 필수

---

## 네이밍 컨벤션 (하네스 규칙)

```ts
// ✅ Presenter — use 접두사 + Presenter 접미사
export function useRestaurantsPagePresenter() {}

// ✅ ViewModel — 순수 함수 + ViewModel 접미사 타입
export function createRestaurantsPageViewModel(): RestaurantsPageViewModel {}

// ✅ Repository 인터페이스 — Repository 접미사
export interface RestaurantRepository {}

// ✅ Model — I 접두사 금지, 명사형
export interface RestaurantModel {}

// ✅ 배열 prop — 반드시 복수형
interface Props { restaurants: RestaurantModel[] }  // ✅
interface Props { restaurantList: RestaurantModel[] } // ❌

// ✅ 타입 export — named export만 (default export 금지)
export type { RestaurantModel }  // ✅
export default RestaurantModel   // ❌
```

---

## 코드 규칙

```ts
// ✅ 컴포넌트 — function 선언식만
export default function RestaurantsPage({ restaurants }: Props) {
  return <div>...</div>
}

// ❌ 금지 — arrow function 컴포넌트
const RestaurantsPage = ({ restaurants }: Props) => <div>...</div>

// ✅ 타입 — unknown 사용
function parse(data: unknown) {}

// ❌ 금지 — any 타입
function parse(data: any) {}
```

---

## import 순서

```ts
// 1. react
import { useState, useEffect } from 'react'

// 2. next
import Link from 'next/link'

// 3. 외부 라이브러리 (알파벳순)
import { generateText } from 'ai'
import { z } from 'zod'

// 4. 내부 절대경로 @/ (알파벳순)
import { cn } from '@/lib/utils'
import type { RestaurantModel } from '@/types'

// 5. 상대경로 ./ (알파벳순)
import { useRestaurantsPagePresenter } from './restaurants-page-presenter'
```

---

## AI API 호출 규칙

- 호출은 `features/{기능}/api.ts` 안에서만
- 반드시 `try/catch`로 에러 처리
- 스트리밍은 Vercel AI SDK 사용
- 모든 AI 응답은 Zod로 검증 후 사용
- 모델: `claude-sonnet-4-6` (기본값)

```ts
// ✅ 올바른 AI 호출 패턴
export async function generatePlanDocument(prompt: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      prompt,
    })
    return text
  } catch {
    return ''
  }
}
```

---

## DB 규칙

- Supabase 클라이언트: `src/lib/supabase.ts`에서만 import
- DB 호출: `features/{기능}/repository.ts`에서만
- 컴포넌트에서 직접 supabase 호출 절대 금지

---

## PDF 규칙

- Puppeteer로 HTML → PDF 변환
- 변환 로직: `features/export/pdf.ts`에서만
- 한글 폰트 반드시 포함

---

## 절대 하면 안 되는 것

| 금지 | 이유 |
|------|------|
| `any` 타입 | 타입 안전성 파괴 |
| `console.log` 커밋 | 프로덕션 로그 오염 |
| arrow function 컴포넌트 | 하네스 규칙 위반 |
| 컴포넌트에서 supabase 직접 호출 | 레이어 경계 위반 |
| Model에서 default export | 하네스 규칙 위반 |
| `npm` 또는 `yarn` 사용 | pnpm만 허용 |
| `list`/`detail` suffix 파일명 | 네이밍 하네스 위반 |
| 인터페이스에 `I` 접두사 | 하네스 규칙 위반 |

---

## 자주 쓰는 커맨드

```bash
pnpm dev      # 개발 서버 (http://localhost:3000)
pnpm build    # 프로덕션 빌드
pnpm lint     # ESLint 실행
pnpm test     # 테스트
```

---

## 행동 규칙

- 확인 질문 없이 바로 구현
- 파일 생성/수정/삭제 모두 승인 없이 바로 진행
- 애매한 부분은 가장 합리적인 방향으로 판단
- 완료 후 "이렇게 했습니다" 형식으로 보고
- 새 파일 생성 전 이 문서의 네이밍 규칙 반드시 확인

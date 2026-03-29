'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { AIModel, Case, DesignSubTab } from '@/types'

interface Props {
  cases: Case[]
  runId: string | null
  activeAgent: AIModel
}

const DESIGN_SUBTABS: { id: DesignSubTab; label: string }[] = [
  { id: 'spec', label: 'Spec' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'domain-model', label: 'Domain Model' },
  { id: 'architecture', label: 'Architecture' },
]

const AGENTS: AIModel[] = ['codex', 'gemini', 'claude']
const AGENT_LABELS: Record<AIModel, string> = {
  codex: 'Codex CLI',
  gemini: 'Gemini CLI',
  claude: 'Claude Code',
}

const SPEC_CONTENT: Record<AIModel, string> = {
  codex: `DIOiTs 고객용 앱 Spec

User Stories

US-01: 음식점 탐색
As a customer, I want to browse nearby restaurants so that I can find food I want to order.
• View restaurant list sorted by distance
• Filter by cuisine category (한식, 중식, 일식...)
• See rating, delivery time, minimum order amount

US-02: 음식점 검색
As a customer, I want to search restaurants by name so that I can quickly find a specific place.
• Search with debounce
• History suggestions

US-03: 메뉴 주문
As a customer, I want to add items to cart and order so that I can get food delivered.
• Multi-item selection with options`,
  gemini: `1. Feature Overview

1.1 Restaurant Discovery
FEATURE        PRIORITY  DESCRIPTION
Category Browsing  P0  Browse by cuisine type
Location-based List P0  Show nearby restaurants
Search             P0  Full-text search
Recommendations    P1  Personalized suggestions

1.3 Ordering System
FEATURE     PRIORITY  DESCRIPTION
Menu Viewing  P0  Restaurant menu display
Cart          P0  Multi-item cart
Checkout      P0  Payment & order placement
Order Tracking P0  Real-time delivery status

1.3 User Features
FEATURE   PRIORITY  DESCRIPTION
Reviews     P1  Write & view reviews`,
  claude: `핵심 도메인
• Restaurant: 음식점 정보, 메뉴, 카테고리
• Order: 주문 항목, 상태, 결제
• Delivery: 배달 경로, 기사 위치
• Review: 리뷰 작성, 평점

Functional Requirements

FR-001: 음식점 목록
• 위치 기반 음식점 목록 표시
• 카테고리 필터 (한식/중식/일식/양식/기타)
• 정렬 옵션: 거리순, 평점순, 배달시간순
• 최소 주문금액, 배달비, 예상 배달시간 표시

FR-002: 음식점 상세
• 메뉴 카테고리별 그룹
• 메뉴 아이템 이름, 가격, 설명, 이미지
• 옵션/사이드 선택

FR-003: 장바구니 & 주문
• 다음 아이템 장바구니
• 수량 조절, 옵션 변경
• 주문 금액 계산 (소계, 배달비, 합계)`,
}

const DOMAIN_MODEL_CONTENT: Record<AIModel, string> = {
  codex: `// Restaurant Domain
interface RestaurantModel {
  id: string
  name: string
  category: RestaurantCategory
  rating: number
  deliveryTime: number
  minOrderAmount: number
  imageUrl: string
}

// Order Domain
interface OrderModel {
  id: string
  restaurantId: string
  items: OrderItemModel[]
  status: OrderStatus
  totalAmount: number
  deliveryFee: number
}

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'picked_up'
  | 'delivered'`,
  gemini: `// Core Domain Models
export interface RestaurantModel {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly rating: number
  readonly deliveryTime: number
  readonly minOrderAmount: number
}

export interface MenuItemModel {
  readonly id: string
  readonly restaurantId: string
  readonly name: string
  readonly price: number
  readonly options: MenuOptionModel[]
}

export interface CartModel {
  items: CartItemModel[]
  restaurantId: string
  subtotal: number
}`,
  claude: `// 도메인 모델 정의

export type RestaurantCategory =
  | '한식' | '중식' | '일식'
  | '양식' | '분식' | '카페'

export interface RestaurantModel {
  id: string
  name: string
  category: RestaurantCategory
  rating: number
  reviewCount: number
  deliveryTime: number
  deliveryFee: number
  minOrderAmount: number
  imageUrl: string
  isOpen: boolean
}

export interface OrderModel {
  id: string
  customerId: string
  restaurantId: string
  items: OrderItemModel[]
  status: OrderStatus
  createdAt: Date
}`,
}

const ARCHITECTURE_CONTENT: Record<AIModel, string> = {
  codex: `packages/core/src/
├── domain/
│   ├── restaurant/
│   │   ├── restaurant-model.ts
│   │   ├── restaurant-repository.ts
│   │   └── restaurant-use-cases.ts
│   └── order/
│       ├── order-model.ts
│       └── order-repository.ts
├── infrastructure/
│   └── supabase/
│       ├── supabase-adapter.ts
│       └── restaurant-repository-supabase.ts
└── presentation/
    └── pages/
        └── restaurants/
            ├── restaurants-page.tsx
            ├── restaurants-page-presenter.ts
            └── restaurants-page-view-model.ts`,
  gemini: `packages/
├── core/                 # Shared domain models
│   ├── src/domain/
│   └── src/infrastructure/
├── customer/             # Customer app
│   ├── src/pages/
│   └── src/components/
├── rider/                # Rider app
└── admin/                # Admin dashboard

Architecture Pattern: MVPVM
├── Model      → Pure domain types
├── View       → React components (dumb)
├── Presenter  → Business logic hooks
└── ViewModel  → UI state derived from domain`,
  claude: `MVPVM 아키텍처

packages/core/src/
├── domain/
│   └── restaurant/
│       ├── restaurant-model.ts          # 도메인 타입
│       ├── restaurant-repository.ts     # 인터페이스
│       └── restaurant-response-entity.ts
├── infrastructure/
│   └── supabase/
│       ├── supabase-adapter.ts
│       └── restaurant-repository-supabase.ts
└── presentation/
    └── pages/
        └── restaurants/
            ├── restaurants-page.tsx          # View
            ├── restaurants-page-presenter.ts # Presenter
            └── restaurants-page-view-model.ts # ViewModel`,
}

const CONTENT_MAP: Record<DesignSubTab, Record<AIModel, string>> = {
  spec: SPEC_CONTENT,
  blueprint: SPEC_CONTENT,
  'domain-model': DOMAIN_MODEL_CONTENT,
  architecture: ARCHITECTURE_CONTENT,
}

export default function DesignTab({ runId }: Props) {
  const [subTab, setSubTab] = useState<DesignSubTab>('spec')
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  useEffect(() => {
    if (runId) {
      const timer = setTimeout(() => setStatus('done'), 2000)
      return () => clearTimeout(timer)
    }
  }, [runId])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          Architecture &amp; Design Phase
        </h2>
        <p className="text-sm text-gray-500 mt-1.5">
          Spec, Blueprint를 기반으로 DDD 도메인 모델과 아키텍처를 설계합니다.
          동일한 기획서로부터 AI마다 다른 설계 결정을 내립니다.
        </p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {DESIGN_SUBTABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              subTab === tab.id
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {AGENTS.map((model) => (
          <div key={model} className="border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
              <span className="text-sm font-semibold text-gray-800">
                {AGENT_LABELS[model]}
              </span>
            </div>
            {status === 'done' ? (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                {CONTENT_MAP[subTab][model]}
              </pre>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Run the benchmark to generate design documents.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

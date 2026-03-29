import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { PlanBenchmarkResult, PlanResult } from '@/types'

const RequestSchema = z.object({
  requirement: z.string().min(1),
})

const PLAN_SYSTEM = `You are a senior product manager and solution architect.
Given a software requirement, generate three planning documents.

Output format — use EXACTLY these separators, nothing else before or after:

=== MEETING LOG ===
[Write a structured meeting log as if a kickoff meeting happened for this requirement.
Include: date, attendees summary, key discussion points, decisions made, action items.
Keep it realistic and concise — 15-20 lines.]

=== CPS ===
[Write a Context-Problem-Solution document.
Sections: Context (situation/constraints), Problem (core challenge as "How might we..."), Solution (approach with trade-offs).
Keep it focused — 15-20 lines.]

=== PRD ===
[Write a Product Requirements Document.
Sections: Overview, Target Users, Key Features (P0/P1), User Flow (numbered steps), Non-Functional Requirements.
Keep it practical — 20-25 lines.]`

async function generateClaudePlan(requirement: string): Promise<PlanResult> {
  const { text } = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    system: PLAN_SYSTEM,
    prompt: `Generate planning documents for: ${requirement}`,
    maxOutputTokens: 2000,
  })

  const meetingLogMatch = text.match(
    /=== MEETING LOG ===([\s\S]*?)(?==== CPS ===|$)/
  )
  const cpsMatch = text.match(/=== CPS ===([\s\S]*?)(?==== PRD ===|$)/)
  const prdMatch = text.match(/=== PRD ===([\s\S]*?)$/)

  return {
    meetingLog: meetingLogMatch?.[1]?.trim() ?? '',
    cps: cpsMatch?.[1]?.trim() ?? '',
    prd: prdMatch?.[1]?.trim() ?? '',
  }
}

function generateGeminiStub(requirement: string): PlanResult {
  const topic = requirement.slice(0, 60)
  return {
    meetingLog: `Meeting Log — ${topic}

Date: ${new Date().toISOString().slice(0, 10)} | Duration: 45min
Attendees: PM, Tech Lead, Designer, 2x Engineers

Key Discussion
+ Reviewed requirement scope and constraints
+ Agreed on MVPVM architecture pattern
+ Identified core domain entities
+ Set initial sprint timeline

Decisions
- Use existing design system for UI components
- Prioritize mobile-first responsive layout
- Phase 1: Core CRUD + basic navigation
- Phase 2: Real-time features + notifications

Action Items
- [ ] PM: Finalize user stories by EOW
- [ ] TL: Set up project scaffold
- [ ] Design: Wireframes for core screens`,

    cps: `Context-Problem-Solution — ${topic}

Context
+ Mobile-first user base with high engagement expectations
+ Existing backend infrastructure can be leveraged
+ Team familiar with React/TypeScript stack

Problem
"How might we deliver ${requirement.slice(0, 40)} in a way that scales?"

Constraints
- Must work offline-first
- < 2s initial load target
- Accessible (WCAG 2.1 AA)

Solution
- Server components for initial render performance
- Optimistic UI for interactions
- Incremental static regeneration for list views

Trade-offs
+ SSR vs CSR: chose hybrid for SEO + performance
+ Real-time: polling first, WebSocket in Phase 2`,

    prd: `PRD — ${topic}

Overview
${requirement}

Target Users
- Primary: End users (daily active)
- Secondary: Admins (weekly active)

Key Features
P0 — Must Have
- Core ${requirement.slice(0, 30)} functionality
- Authentication & authorization
- Mobile responsive layout
- Error handling & loading states

P1 — Important
- Search & filter
- Notifications
- Export/share

User Flow
1. Entry point → 2. Auth → 3. Main list view
4. Detail view → 5. Create/Edit action → 6. Confirmation

Non-Functional
- Load time < 2s (P95)
- Uptime > 99.9%
- WCAG 2.1 AA compliance`,
  }
}

function generateCodexStub(requirement: string): PlanResult {
  const topic = requirement.slice(0, 60)
  return {
    meetingLog: `# Meeting Log — ${topic}

[${new Date().toISOString().slice(0, 10)}] Sprint Planning Session

Participants: Engineering team (4), Product (1)

AGENDA ITEMS:
1. Requirement clarification
2. Technical approach
3. Story point estimation
4. Sprint commitment

NOTES:
- Team reviewed requirement: "${requirement.slice(0, 80)}"
- Agreed on component breakdown
- Identified 3 high-risk areas: auth, data sync, mobile perf
- Decided to use existing API patterns

DECISIONS:
✓ Start with happy path, add edge cases in sprint 2
✓ Code review required for all PRs
✓ Daily standup at 10am

TODO:
→ Set up feature branch
→ Create Jira tickets
→ Update design tokens`,

    cps: `# CPS — ${topic}

## 1. Problem Statement
${requirement}

## Context
- Users need a reliable, fast interface
- Data consistency is critical
- Team has 2 sprint capacity

## Problem
Core challenge: delivering value quickly without technical debt

## Solution (First Pass)
- Modular MVPVM components
- API-first design for testability
- Feature flags for gradual rollout

## Risks
- Scope creep (mitigate: strict P0/P1 split)
- Performance on low-end devices (mitigate: lazy loading)`,

    prd: `# PRD — ${topic}

## Product Overview
${requirement}

## Success Metrics
- Task completion rate > 85%
- Error rate < 1%
- NPS > 40

## Features
### Must Have (P0)
- Core functionality per requirement
- Basic CRUD operations
- Auth integration

### Should Have (P1)
- Advanced filters
- Bulk operations
- Activity history

## Technical Notes
- Stack: Next.js + TypeScript
- Architecture: MVPVM
- DB: Supabase

## Timeline
- Sprint 1: Core P0 features
- Sprint 2: P1 + polish
- Sprint 3: QA + launch`,
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as unknown
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { requirement } = parsed.data
  const runId = `plan_${Date.now()}`

  let claudePlan: PlanResult
  try {
    claudePlan = await generateClaudePlan(requirement)
  } catch {
    claudePlan = {
      meetingLog: 'Generation failed.',
      cps: 'Generation failed.',
      prd: 'Generation failed.',
    }
  }

  const result: PlanBenchmarkResult = {
    runId,
    requirement,
    claude: claudePlan,
    gemini: generateGeminiStub(requirement),
    codex: generateCodexStub(requirement),
  }

  return NextResponse.json(result)
}

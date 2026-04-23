# Groundflare Frontend Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-first Groundflare verification experience that looks like a mainstream image CAPTCHA, runs from this empty repo, exposes stable mock API routes, and supports the approved 10-round pass/fail flow.

**Architecture:** Use a single Next.js app-router application so the verification UI and the future backend-facing API surface live in one codebase. Keep challenge math and session logic in pure server-side modules, keep the public UI in focused client components, and let a single client hook orchestrate the finite-state flow against `GET /api/challenge/config`, `POST /api/challenge/start`, and `POST /api/challenge/answer`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Vitest, React Testing Library

---

## File Structure

- `package.json` - scripts and dependency manifest for Next.js, Tailwind, and Vitest
- `tsconfig.json` - TypeScript configuration with `@/*` path alias
- `next-env.d.ts` - Next.js type bootstrap
- `postcss.config.js` - Tailwind PostCSS integration
- `tailwind.config.ts` - Tailwind content scanning for `app/` and `src/`
- `app/layout.tsx` - top-level HTML shell and global font/body wiring
- `app/page.tsx` - entry page that mounts the verification experience
- `app/globals.css` - Tailwind layers and base page styling
- `app/api/challenge/config/route.ts` - public configuration endpoint
- `app/api/challenge/start/route.ts` - session start endpoint
- `app/api/challenge/answer/route.ts` - answer submission endpoint
- `public/1.mp3` - challenge audio track served from the app public directory
- `src/lib/challenge-types.ts` - shared request/response and view-state types
- `src/lib/challenge-rules.ts` - pass/fail math and remaining-chances helpers
- `src/lib/api-client.ts` - typed fetch wrapper for the three public endpoints
- `src/lib/audio-controller.ts` - audio fade-in and fade-out controller
- `src/server/mock-question-bank.ts` - deterministic mock round data used by the in-memory service
- `src/server/challenge-service.ts` - in-memory session store and scoring logic
- `src/components/VerificationExperience.tsx` - client composition root for the page
- `src/components/VerificationShell.tsx` - initial loading shell and `我是人类` entry point
- `src/components/ChallengeCard.tsx` - 3x3 image selection card and round-local image error handling
- `src/components/ChallengeStatusPanel.tsx` - wrong-answer count, remaining chances, and rule summary
- `src/components/ResultCard.tsx` - success or failure terminal state card
- `src/hooks/useChallengeFlow.ts` - finite-state orchestration, fetch calls, redirect timer, and retry behavior
- `src/test/setup.ts` - jest-dom registration for component tests
- `src/components/__tests__/VerificationExperience.test.tsx` - integration-style UI flow coverage
- `src/components/__tests__/ChallengeCard.test.tsx` - selection and image-error coverage for the grid card
- `src/server/__tests__/challenge-service.test.ts` - pure service coverage for pass/fail math and session behavior
- `app/api/challenge/__tests__/routes.test.ts` - route handler smoke coverage
- `src/lib/__tests__/audio-controller.test.ts` - audio fade behavior coverage

## Task 1: Bootstrap The App Shell

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `postcss.config.js`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `src/components/VerificationExperience.tsx`
- Create: `src/components/__tests__/VerificationExperience.test.tsx`
- Move: `1.mp3` -> `public/1.mp3`

- [ ] **Step 1: Create the package and tooling files**

```json
// package.json
{
  "name": "am-i-real",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run test && npm run build"
  },
  "dependencies": {
    "next": "15.3.3",
    "react": "19.1.0",
    "react-dom": "19.1.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.3.0",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "22.15.17",
    "@types/react": "19.1.2",
    "@types/react-dom": "19.1.2",
    "@vitejs/plugin-react": "4.4.1",
    "autoprefixer": "10.4.20",
    "jsdom": "26.1.0",
    "postcss": "8.5.3",
    "tailwindcss": "3.4.17",
    "typescript": "5.8.3",
    "vitest": "3.1.3"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

```ts
// next-env.d.ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is intentionally generated-style because Next.js expects it.
```

```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
}

export default config
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  }
})
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Install dependencies and generate `package-lock.json`**

Run: `npm install`
Expected: npm writes `package-lock.json` and completes without prompts.

- [ ] **Step 3: Write the failing smoke test for the page shell**

```tsx
// src/components/__tests__/VerificationExperience.test.tsx
import { render, screen } from '@testing-library/react'
import { VerificationExperience } from '@/src/components/VerificationExperience'

describe('VerificationExperience', () => {
  it('shows the initial verification shell', () => {
    render(<VerificationExperience />)

    expect(screen.getByText('Groundflare')).toBeInTheDocument()
    expect(screen.getByText('正在进行安全验证')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '我是人类' })).toBeDisabled()
  })
})
```

- [ ] **Step 4: Run the smoke test to verify it fails**

Run: `npm exec vitest run src/components/__tests__/VerificationExperience.test.tsx`
Expected: FAIL with a module resolution error because `VerificationExperience` and the app shell files do not exist yet.

- [ ] **Step 5: Write the minimal page shell implementation**

```tsx
// app/layout.tsx
import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">{children}</body>
    </html>
  )
}
```

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

```tsx
// app/page.tsx
import { VerificationExperience } from '@/src/components/VerificationExperience'

export default function HomePage() {
  return <VerificationExperience />
}
```

```tsx
// src/components/VerificationExperience.tsx
'use client'

export function VerificationExperience() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-6 py-4">
          <p className="text-sm font-semibold text-slate-900">Groundflare</p>
          <p className="mt-1 text-xs text-slate-500">Security verification service</p>
        </header>

        <div className="space-y-6 px-6 py-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950">正在进行安全验证</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              本网站需要先验证您的连接安全性。完成验证前，此页面会暂时显示。
            </p>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 bg-blue-600" />
          </div>

          <button
            type="button"
            disabled
            className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-500"
          >
            我是人类
          </button>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 6: Run the smoke test to verify it passes**

Run: `npm exec vitest run src/components/__tests__/VerificationExperience.test.tsx`
Expected: PASS

- [ ] **Step 7: Move the existing audio file into the app public directory**

Run: `mkdir -p public && mv "1.mp3" "public/1.mp3"`
Expected: `public/1.mp3` exists and the repo root no longer contains `1.mp3`.

- [ ] **Step 8: Commit the bootstrap task**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts postcss.config.js tailwind.config.ts vitest.config.ts app src public/1.mp3
git commit -m "chore: bootstrap Groundflare frontend shell"
```

## Task 2: Implement Challenge Rules And The In-Memory Service

**Files:**
- Create: `src/lib/challenge-types.ts`
- Create: `src/lib/challenge-rules.ts`
- Create: `src/server/mock-question-bank.ts`
- Create: `src/server/challenge-service.ts`
- Create: `src/server/__tests__/challenge-service.test.ts`

- [ ] **Step 1: Write the failing service tests**

```ts
// src/server/__tests__/challenge-service.test.ts
import {
  getPublicConfig,
  resetChallengeSessions,
  startChallengeSession,
  submitChallengeAnswer
} from '@/src/server/challenge-service'
import { MOCK_ROUNDS } from '@/src/server/mock-question-bank'

function getWrongOptionId(roundIndex: number) {
  const round = MOCK_ROUNDS[roundIndex]
  return round.options.find((option) => option.id !== round.correctOptionId)?.id ?? ''
}

describe('challenge-service', () => {
  beforeEach(() => {
    resetChallengeSessions()
  })

  it('returns the approved public config', () => {
    expect(getPublicConfig()).toMatchObject({
      brandName: 'Groundflare',
      displaySiteName: 'www.spark-app.store',
      successRedirectUrl: 'https://www.spark-app.store',
      audioUrl: '/1.mp3',
      totalRounds: 10,
      requiredPassCount: 7
    })
  })

  it('starts a session with a 9-image first round and no scoring metadata in the public payload', () => {
    const started = startChallengeSession()

    expect(started.sessionId).toBeTruthy()
    expect(started.currentRoundIndex).toBe(1)
    expect(started.round.options).toHaveLength(9)
    expect(started.round).not.toHaveProperty('correctOptionId')
  })

  it('fails on the fourth wrong answer', () => {
    const started = startChallengeSession()

    let roundId = started.round.roundId
    let sessionId = started.sessionId

    for (let roundIndex = 0; roundIndex < 4; roundIndex += 1) {
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: getWrongOptionId(roundIndex)
      })

      if (roundIndex < 3) {
        expect(response.status).toBe('continue')
        if (response.status === 'continue') {
          roundId = response.round.roundId
        }
      } else {
        expect(response).toEqual(
          expect.objectContaining({
            status: 'failed',
            mistakeCount: 4,
            message: '你不是人类！'
          })
        )
      }
    }
  })

  it('passes immediately on the seventh correct answer', () => {
    const started = startChallengeSession()

    let roundId = started.round.roundId
    let sessionId = started.sessionId

    for (let roundIndex = 0; roundIndex < 7; roundIndex += 1) {
      const response = submitChallengeAnswer({
        sessionId,
        roundId,
        selectedOptionId: MOCK_ROUNDS[roundIndex].correctOptionId
      })

      if (roundIndex < 6) {
        expect(response.status).toBe('continue')
        if (response.status === 'continue') {
          roundId = response.round.roundId
        }
      } else {
        expect(response).toEqual(
          expect.objectContaining({
            status: 'passed',
            correctCount: 7,
            redirectUrl: 'https://www.spark-app.store'
          })
        )
      }
    }
  })
})
```

- [ ] **Step 2: Run the service test file to verify it fails**

Run: `npm exec vitest run src/server/__tests__/challenge-service.test.ts`
Expected: FAIL because `challenge-service`, `challenge-rules`, and `mock-question-bank` do not exist yet.

- [ ] **Step 3: Write the shared types, rules, mock bank, and service implementation**

```ts
// src/lib/challenge-types.ts
export type ChallengeViewState =
  | 'loading'
  | 'readyToVerify'
  | 'inChallenge'
  | 'submitting'
  | 'passed'
  | 'failed'
  | 'expired'
  | 'error'

export interface PublicChallengeConfig {
  brandName: string
  displaySiteName: string
  successRedirectUrl: string
  audioUrl: string
  totalRounds: number
  requiredPassCount: number
}

export interface ChallengeOption {
  id: string
  imageUrl: string
  alt: string
}

export interface PublicRound {
  roundId: string
  prompt: string
  options: ChallengeOption[]
}

export interface InternalRound extends PublicRound {
  correctOptionId: string
}

export interface ChallengeStartResponse extends PublicChallengeConfig {
  sessionId: string
  currentRoundIndex: number
  round: PublicRound
}

export interface ChallengeAnswerRequest {
  sessionId: string
  roundId: string
  selectedOptionId: string
}

export interface ContinueAnswerResponse {
  status: 'continue'
  correctCount: number
  mistakeCount: number
  remainingMistakesBeforeFailure: number
  currentRoundIndex: number
  round: PublicRound
}

export interface PassedAnswerResponse {
  status: 'passed'
  correctCount: number
  mistakeCount: number
  redirectUrl: string
}

export interface FailedAnswerResponse {
  status: 'failed'
  correctCount: number
  mistakeCount: number
  message: string
}

export interface ExpiredAnswerResponse {
  status: 'expired'
  message: string
}

export type ChallengeAnswerResponse =
  | ContinueAnswerResponse
  | PassedAnswerResponse
  | FailedAnswerResponse
  | ExpiredAnswerResponse
```

```ts
// src/lib/challenge-rules.ts
export function getFailureMistakeThreshold(totalRounds: number, requiredPassCount: number) {
  return totalRounds - requiredPassCount + 1
}

export function getRemainingMistakesBeforeFailure(
  totalRounds: number,
  requiredPassCount: number,
  mistakeCount: number
) {
  return Math.max(0, getFailureMistakeThreshold(totalRounds, requiredPassCount) - mistakeCount)
}

export function getChallengeOutcome(
  totalRounds: number,
  requiredPassCount: number,
  correctCount: number,
  mistakeCount: number
) {
  if (correctCount >= requiredPassCount) {
    return 'passed'
  }

  if (mistakeCount >= getFailureMistakeThreshold(totalRounds, requiredPassCount)) {
    return 'failed'
  }

  return 'continue'
}
```

```ts
// src/server/mock-question-bank.ts
import type { InternalRound, PublicChallengeConfig, PublicRound } from '@/src/lib/challenge-types'

export const PUBLIC_CHALLENGE_CONFIG: PublicChallengeConfig = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioUrl: '/1.mp3',
  totalRounds: 10,
  requiredPassCount: 7
}

const REAL_POSITIONS = [1, 4, 7, 2, 8, 0, 5, 3, 6, 4]

const REAL_PHOTO_URLS = Array.from({ length: 10 }, (_, index) => {
  return `https://picsum.photos/seed/groundflare-real-${index + 1}/512/512`
})

const AI_IMAGE_URLS = Array.from({ length: 8 }, (_, index) => {
  return `https://placehold.co/512x512/e2e8f0/334155?text=AI+${index + 1}`
})

export const MOCK_ROUNDS: InternalRound[] = REAL_POSITIONS.map((realPosition, roundIndex) => {
  const options = Array.from({ length: 9 }, (_, optionIndex) => {
    const id = `round-${roundIndex + 1}-option-${optionIndex + 1}`
    const isReal = optionIndex === realPosition

    return {
      id,
      imageUrl: isReal
        ? REAL_PHOTO_URLS[roundIndex]
        : `${AI_IMAGE_URLS[optionIndex % AI_IMAGE_URLS.length]}&round=${roundIndex + 1}`,
      alt: `Round ${roundIndex + 1} candidate ${optionIndex + 1}`
    }
  })

  return {
    roundId: `round-${roundIndex + 1}`,
    prompt: '请选择唯一真实照片',
    correctOptionId: options[realPosition].id,
    options
  }
})

export function toPublicRound(round: InternalRound): PublicRound {
  return {
    roundId: round.roundId,
    prompt: round.prompt,
    options: round.options
  }
}
```

```ts
// src/server/challenge-service.ts
import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  InternalRound,
  PublicChallengeConfig
} from '@/src/lib/challenge-types'
import { getChallengeOutcome, getRemainingMistakesBeforeFailure } from '@/src/lib/challenge-rules'
import { MOCK_ROUNDS, PUBLIC_CHALLENGE_CONFIG, toPublicRound } from '@/src/server/mock-question-bank'

interface ChallengeSession {
  sessionId: string
  rounds: InternalRound[]
  currentRoundIndex: number
  correctCount: number
  mistakeCount: number
}

const sessions = new Map<string, ChallengeSession>()

function cloneRounds() {
  return MOCK_ROUNDS.map((round) => ({
    ...round,
    options: round.options.map((option) => ({ ...option }))
  }))
}

function failResponse(session: ChallengeSession) {
  return {
    status: 'failed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    message: '你不是人类！'
  }
}

function passResponse(session: ChallengeSession) {
  return {
    status: 'passed' as const,
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    redirectUrl: PUBLIC_CHALLENGE_CONFIG.successRedirectUrl
  }
}

export function getPublicConfig(): PublicChallengeConfig {
  return PUBLIC_CHALLENGE_CONFIG
}

export function resetChallengeSessions() {
  sessions.clear()
}

export function startChallengeSession(): ChallengeStartResponse {
  const rounds = cloneRounds()
  const sessionId = crypto.randomUUID()

  const session: ChallengeSession = {
    sessionId,
    rounds,
    currentRoundIndex: 0,
    correctCount: 0,
    mistakeCount: 0
  }

  sessions.set(sessionId, session)

  return {
    ...PUBLIC_CHALLENGE_CONFIG,
    sessionId,
    currentRoundIndex: 1,
    round: toPublicRound(rounds[0])
  }
}

export function submitChallengeAnswer(input: ChallengeAnswerRequest): ChallengeAnswerResponse {
  const session = sessions.get(input.sessionId)

  if (!session) {
    return {
      status: 'expired',
      message: '验证已过期，请重新开始'
    }
  }

  const round = session.rounds[session.currentRoundIndex]

  if (!round || round.roundId !== input.roundId) {
    sessions.delete(input.sessionId)
    return {
      status: 'expired',
      message: '验证已过期，请重新开始'
    }
  }

  if (input.selectedOptionId === round.correctOptionId) {
    session.correctCount += 1
  } else {
    session.mistakeCount += 1
  }

  const outcome = getChallengeOutcome(
    PUBLIC_CHALLENGE_CONFIG.totalRounds,
    PUBLIC_CHALLENGE_CONFIG.requiredPassCount,
    session.correctCount,
    session.mistakeCount
  )

  if (outcome === 'passed') {
    sessions.delete(input.sessionId)
    return passResponse(session)
  }

  if (outcome === 'failed') {
    sessions.delete(input.sessionId)
    return failResponse(session)
  }

  session.currentRoundIndex += 1
  const nextRound = session.rounds[session.currentRoundIndex]

  if (!nextRound) {
    sessions.delete(input.sessionId)
    return failResponse(session)
  }

  return {
    status: 'continue',
    correctCount: session.correctCount,
    mistakeCount: session.mistakeCount,
    remainingMistakesBeforeFailure: getRemainingMistakesBeforeFailure(
      PUBLIC_CHALLENGE_CONFIG.totalRounds,
      PUBLIC_CHALLENGE_CONFIG.requiredPassCount,
      session.mistakeCount
    ),
    currentRoundIndex: session.currentRoundIndex + 1,
    round: toPublicRound(nextRound)
  }
}
```

- [ ] **Step 4: Run the service test file to verify it passes**

Run: `npm exec vitest run src/server/__tests__/challenge-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the rules and service task**

```bash
git add src/lib/challenge-types.ts src/lib/challenge-rules.ts src/server/mock-question-bank.ts src/server/challenge-service.ts src/server/__tests__/challenge-service.test.ts
git commit -m "feat: add Groundflare challenge session logic"
```

## Task 3: Expose The Public API Routes

**Files:**
- Create: `app/api/challenge/config/route.ts`
- Create: `app/api/challenge/start/route.ts`
- Create: `app/api/challenge/answer/route.ts`
- Create: `app/api/challenge/__tests__/routes.test.ts`
- Create: `src/lib/api-client.ts`

- [ ] **Step 1: Write the failing route smoke tests**

```ts
// app/api/challenge/__tests__/routes.test.ts
import { GET as getConfig } from '@/app/api/challenge/config/route'
import { POST as postStart } from '@/app/api/challenge/start/route'
import { POST as postAnswer } from '@/app/api/challenge/answer/route'
import { resetChallengeSessions } from '@/src/server/challenge-service'
import { MOCK_ROUNDS } from '@/src/server/mock-question-bank'

describe('challenge routes', () => {
  beforeEach(() => {
    resetChallengeSessions()
  })

  it('returns the public config from GET /api/challenge/config', async () => {
    const response = await getConfig()
    const json = await response.json()

    expect(json).toMatchObject({
      displaySiteName: 'www.spark-app.store',
      successRedirectUrl: 'https://www.spark-app.store'
    })
  })

  it('starts a session and accepts an answer through the route handlers', async () => {
    const startedResponse = await postStart()
    const started = await startedResponse.json()

    const answerResponse = await postAnswer(
      new Request('http://localhost/api/challenge/answer', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: started.sessionId,
          roundId: started.round.roundId,
          selectedOptionId: MOCK_ROUNDS[0].correctOptionId
        })
      })
    )

    const answered = await answerResponse.json()

    expect(answered).toMatchObject({
      status: 'continue',
      currentRoundIndex: 2,
      correctCount: 1
    })
  })
})
```

- [ ] **Step 2: Run the route smoke tests to verify they fail**

Run: `npm exec vitest run app/api/challenge/__tests__/routes.test.ts`
Expected: FAIL because the route files and the client wrapper do not exist yet.

- [ ] **Step 3: Write the route handlers and the typed API client**

```ts
// app/api/challenge/config/route.ts
import { NextResponse } from 'next/server'
import { getPublicConfig } from '@/src/server/challenge-service'

export async function GET() {
  return NextResponse.json(getPublicConfig())
}
```

```ts
// app/api/challenge/start/route.ts
import { NextResponse } from 'next/server'
import { startChallengeSession } from '@/src/server/challenge-service'

export async function POST() {
  return NextResponse.json(startChallengeSession())
}
```

```ts
// app/api/challenge/answer/route.ts
import { NextResponse } from 'next/server'
import { submitChallengeAnswer } from '@/src/server/challenge-service'
import type { ChallengeAnswerRequest } from '@/src/lib/challenge-types'

export async function POST(request: Request) {
  const payload = (await request.json()) as ChallengeAnswerRequest
  return NextResponse.json(submitChallengeAnswer(payload))
}
```

```ts
// src/lib/api-client.ts
import type {
  ChallengeAnswerRequest,
  ChallengeAnswerResponse,
  ChallengeStartResponse,
  PublicChallengeConfig
} from '@/src/lib/challenge-types'

async function readJson<T>(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchPublicConfig() {
  return readJson<PublicChallengeConfig>(await fetch('/api/challenge/config'))
}

export async function startChallenge() {
  return readJson<ChallengeStartResponse>(
    await fetch('/api/challenge/start', {
      method: 'POST'
    })
  )
}

export async function submitChallengeAnswer(payload: ChallengeAnswerRequest) {
  return readJson<ChallengeAnswerResponse>(
    await fetch('/api/challenge/answer', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
  )
}
```

- [ ] **Step 4: Run the route smoke tests to verify they pass**

Run: `npm exec vitest run app/api/challenge/__tests__/routes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the API route task**

```bash
git add app/api/challenge src/lib/api-client.ts
git commit -m "feat: expose mock Groundflare challenge API"
```

## Task 4: Build The Verification UI And Flow Hook

**Files:**
- Create: `src/components/VerificationShell.tsx`
- Create: `src/components/ChallengeCard.tsx`
- Create: `src/components/ChallengeStatusPanel.tsx`
- Create: `src/hooks/useChallengeFlow.ts`
- Modify: `src/components/VerificationExperience.tsx`
- Modify: `src/components/__tests__/VerificationExperience.test.tsx`
- Create: `src/components/__tests__/ChallengeCard.test.tsx`

- [ ] **Step 1: Write the failing UI and flow tests**

```tsx
// src/components/__tests__/ChallengeCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChallengeCard } from '@/src/components/ChallengeCard'
import type { PublicRound } from '@/src/lib/challenge-types'

const round: PublicRound = {
  roundId: 'round-01',
  prompt: '请选择唯一真实照片',
  options: Array.from({ length: 9 }, (_, index) => ({
    id: `option-${index + 1}`,
    imageUrl: `https://example.com/${index + 1}.png`,
    alt: `Round one option ${index + 1}`
  }))
}

describe('ChallengeCard', () => {
  it('keeps the verify button disabled until one option is selected', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <ChallengeCard
        round={round}
        selectedOptionId={null}
        isSubmitting={false}
        errorMessage={null}
        onSelect={onSelect}
        onSubmit={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '验证' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Round one option 2' }))

    expect(onSelect).toHaveBeenCalledWith('option-2')
  })
})
```

```tsx
// src/components/__tests__/VerificationExperience.test.tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerificationExperience } from '@/src/components/VerificationExperience'

const configResponse = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioUrl: '/1.mp3',
  totalRounds: 10,
  requiredPassCount: 7
}

const startResponse = {
  ...configResponse,
  sessionId: 'sess_123',
  currentRoundIndex: 1,
  round: {
    roundId: 'round-01',
    prompt: '请选择唯一真实照片',
    options: Array.from({ length: 9 }, (_, index) => ({
      id: `option-${index + 1}`,
      imageUrl: `https://example.com/${index + 1}.png`,
      alt: `Round one option ${index + 1}`
    }))
  }
}

const continueResponse = {
  status: 'continue',
  correctCount: 0,
  mistakeCount: 1,
  remainingMistakesBeforeFailure: 3,
  currentRoundIndex: 2,
  round: {
    roundId: 'round-02',
    prompt: '请选择唯一真实照片',
    options: Array.from({ length: 9 }, (_, index) => ({
      id: `round-two-option-${index + 1}`,
      imageUrl: `https://example.com/round-two-${index + 1}.png`,
      alt: `Round two option ${index + 1}`
    }))
  }
}

describe('VerificationExperience', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads config, starts the challenge, and updates the status panel after an answer', async () => {
    const user = userEvent.setup()

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify(configResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(startResponse)))
      .mockResolvedValueOnce(new Response(JSON.stringify(continueResponse)))

    render(<VerificationExperience />)

    expect(await screen.findByText('www.spark-app.store')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '我是人类' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '我是人类' }))

    expect(await screen.findByText('请选择唯一真实照片')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Round one option 1' }))
    await user.click(screen.getByRole('button', { name: '验证' }))

    expect(await screen.findByText('已答错 1 题')).toBeInTheDocument()
    expect(screen.getByText('剩余 3 次机会')).toBeInTheDocument()
    expect(screen.getByText('第 2 / 10 轮')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the UI test files to verify they fail**

Run: `npm exec vitest run src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx`
Expected: FAIL because the shell, challenge card, status panel, and flow hook are not implemented.

- [ ] **Step 3: Write the UI components and the flow hook**

```tsx
// src/components/VerificationShell.tsx
interface VerificationShellProps {
  brandName: string
  displaySiteName: string
  canStart: boolean
  progressPercent: number
  errorMessage: string | null
  onStart: () => void
}

export function VerificationShell({
  brandName,
  displaySiteName,
  canStart,
  progressPercent,
  errorMessage,
  onStart
}: VerificationShellProps) {
  return (
    <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 px-6 py-4">
        <p className="text-sm font-semibold text-slate-900">{brandName}</p>
        <p className="mt-1 text-xs text-slate-500">Security verification service</p>
      </header>

      <div className="space-y-6 px-6 py-8">
        <div>
          <p className="text-4xl font-bold tracking-tight text-slate-950">{displaySiteName}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">正在进行安全验证</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            本网站需要先验证您的连接安全性。完成验证前，此页面会暂时显示。请不要关闭或刷新浏览器。
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-blue-600 transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400"
        >
          我是人类
        </button>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      </div>
    </section>
  )
}
```

```tsx
// src/components/ChallengeCard.tsx
'use client'

import { useMemo, useState } from 'react'
import type { PublicRound } from '@/src/lib/challenge-types'

interface ChallengeCardProps {
  round: PublicRound
  selectedOptionId: string | null
  isSubmitting: boolean
  errorMessage: string | null
  onSelect: (optionId: string) => void
  onSubmit: () => void
}

export function ChallengeCard({
  round,
  selectedOptionId,
  isSubmitting,
  errorMessage,
  onSelect,
  onSubmit
}: ChallengeCardProps) {
  const [failedImageIds, setFailedImageIds] = useState<string[]>([])
  const hasImageError = failedImageIds.length > 0

  const buttonDisabled = useMemo(() => {
    return !selectedOptionId || isSubmitting || hasImageError
  }, [selectedOptionId, isSubmitting, hasImageError])

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-blue-600 px-4 py-3 text-white">
        <p className="text-sm font-semibold">{round.prompt}</p>
        <p className="mt-1 text-xs text-blue-100">请从下方 9 张图像中选出真实拍摄的图片</p>
      </header>

      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 sm:gap-3">
        {round.options.map((option) => {
          const isSelected = option.id === selectedOptionId

          return (
            <button
              key={option.id}
              type="button"
              aria-label={option.alt}
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
              className={[
                'group overflow-hidden rounded-md border bg-white',
                isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
              ].join(' ')}
            >
              <img
                src={option.imageUrl}
                alt={option.alt}
                className="aspect-square h-full w-full object-cover"
                onError={() => {
                  setFailedImageIds((current) => (current.includes(option.id) ? current : [...current, option.id]))
                }}
              />
            </button>
          )
        })}
      </div>

      <footer className="space-y-3 border-t border-slate-200 px-4 py-3">
        {hasImageError ? <p className="text-sm text-red-600">图像加载失败，请重新载入此轮</p> : null}
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={buttonDisabled}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? '验证中...' : '验证'}
          </button>
        </div>
      </footer>
    </section>
  )
}
```

```tsx
// src/components/ChallengeStatusPanel.tsx
interface ChallengeStatusPanelProps {
  currentRoundIndex: number
  totalRounds: number
  mistakeCount: number
  remainingMistakesBeforeFailure: number
  requiredPassCount: number
}

export function ChallengeStatusPanel({
  currentRoundIndex,
  totalRounds,
  mistakeCount,
  remainingMistakesBeforeFailure,
  requiredPassCount
}: ChallengeStatusPanelProps) {
  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Challenge Status</p>
        <p className="mt-3 text-lg font-bold text-slate-950">第 {currentRoundIndex} / {totalRounds} 轮</p>
        <p className="mt-2 text-2xl font-bold text-slate-950">已答错 {mistakeCount} 题</p>
        <p className="mt-1 text-sm text-slate-600">剩余 {remainingMistakesBeforeFailure} 次机会</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Verification Rules</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          共 {totalRounds} 轮。答对 {requiredPassCount} 轮及以上显示“验证通过”；若错误次数耗尽则显示“你不是人类！”。
        </p>
      </section>
    </aside>
  )
}
```

```ts
// src/hooks/useChallengeFlow.ts
'use client'

import { useEffect, useState } from 'react'
import type { ChallengeViewState, PublicChallengeConfig, PublicRound } from '@/src/lib/challenge-types'
import { fetchPublicConfig, startChallenge, submitChallengeAnswer } from '@/src/lib/api-client'

const FALLBACK_CONFIG: PublicChallengeConfig = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioUrl: '/1.mp3',
  totalRounds: 10,
  requiredPassCount: 7
}

export function useChallengeFlow() {
  const [viewState, setViewState] = useState<ChallengeViewState>('loading')
  const [config, setConfig] = useState<PublicChallengeConfig>(FALLBACK_CONFIG)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [round, setRound] = useState<PublicRound | null>(null)
  const [currentRoundIndex, setCurrentRoundIndex] = useState(1)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [remainingMistakesBeforeFailure, setRemainingMistakesBeforeFailure] = useState(4)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function loadConfig() {
      try {
        const nextConfig = await fetchPublicConfig()
        setConfig(nextConfig)
        setRemainingMistakesBeforeFailure(nextConfig.totalRounds - nextConfig.requiredPassCount + 1)
        setViewState('readyToVerify')
      } catch {
        setErrorMessage('验证初始化失败，请稍后重试')
        setViewState('readyToVerify')
      }
    }

    void loadConfig()
  }, [])

  async function startVerification() {
    setErrorMessage(null)

    try {
      const started = await startChallenge()
      setConfig(started)
      setSessionId(started.sessionId)
      setRound(started.round)
      setCurrentRoundIndex(started.currentRoundIndex)
      setMistakeCount(0)
      setRemainingMistakesBeforeFailure(started.totalRounds - started.requiredPassCount + 1)
      setSelectedOptionId(null)
      setViewState('inChallenge')
    } catch {
      setErrorMessage('验证启动失败，请重试')
      setViewState('readyToVerify')
    }
  }

  async function submitSelection() {
    if (!sessionId || !round || !selectedOptionId) {
      return
    }

    setViewState('submitting')
    setErrorMessage(null)

    try {
      const response = await submitChallengeAnswer({
        sessionId,
        roundId: round.roundId,
        selectedOptionId
      })

      if (response.status === 'continue') {
        setRound(response.round)
        setCurrentRoundIndex(response.currentRoundIndex)
        setMistakeCount(response.mistakeCount)
        setRemainingMistakesBeforeFailure(response.remainingMistakesBeforeFailure)
        setSelectedOptionId(null)
        setViewState('inChallenge')
        return
      }

      if (response.status === 'expired') {
        setSessionId(null)
        setRound(null)
        setSelectedOptionId(null)
        setErrorMessage(response.message)
        setViewState('readyToVerify')
        return
      }

      setMistakeCount(response.mistakeCount)
      setViewState(response.status)
    } catch {
      setErrorMessage('验证请求超时，请重试')
      setViewState('inChallenge')
    }
  }

  return {
    config,
    viewState,
    round,
    currentRoundIndex,
    mistakeCount,
    remainingMistakesBeforeFailure,
    selectedOptionId,
    errorMessage,
    setSelectedOptionId,
    startVerification,
    submitSelection
  }
}
```

```tsx
// src/components/VerificationExperience.tsx
'use client'

import { ChallengeCard } from '@/src/components/ChallengeCard'
import { ChallengeStatusPanel } from '@/src/components/ChallengeStatusPanel'
import { VerificationShell } from '@/src/components/VerificationShell'
import { useChallengeFlow } from '@/src/hooks/useChallengeFlow'

export function VerificationExperience() {
  const {
    config,
    viewState,
    round,
    currentRoundIndex,
    mistakeCount,
    remainingMistakesBeforeFailure,
    selectedOptionId,
    errorMessage,
    setSelectedOptionId,
    startVerification,
    submitSelection
  } = useChallengeFlow()

  if (viewState === 'loading' || viewState === 'readyToVerify') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <VerificationShell
          brandName={config.brandName}
          displaySiteName={config.displaySiteName}
          canStart={viewState === 'readyToVerify'}
          progressPercent={62}
          errorMessage={errorMessage}
          onStart={startVerification}
        />
      </main>
    )
  }

  if (!round) {
    return null
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" data-testid="challenge-layout">
        <ChallengeCard
          round={round}
          selectedOptionId={selectedOptionId}
          isSubmitting={viewState === 'submitting'}
          errorMessage={errorMessage}
          onSelect={setSelectedOptionId}
          onSubmit={submitSelection}
        />

        <ChallengeStatusPanel
          currentRoundIndex={currentRoundIndex}
          totalRounds={config.totalRounds}
          mistakeCount={mistakeCount}
          remainingMistakesBeforeFailure={remainingMistakesBeforeFailure}
          requiredPassCount={config.requiredPassCount}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run the UI test files to verify they pass**

Run: `npm exec vitest run src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit the UI flow task**

```bash
git add src/components/VerificationShell.tsx src/components/ChallengeCard.tsx src/components/ChallengeStatusPanel.tsx src/hooks/useChallengeFlow.ts src/components/VerificationExperience.tsx src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx
git commit -m "feat: add Groundflare verification interface"
```

## Task 5: Add Audio, Terminal States, Error Recovery, And Final Verification

**Files:**
- Create: `src/lib/audio-controller.ts`
- Create: `src/lib/__tests__/audio-controller.test.ts`
- Create: `src/components/ResultCard.tsx`
- Modify: `src/hooks/useChallengeFlow.ts`
- Modify: `src/components/ChallengeCard.tsx`
- Modify: `src/components/VerificationExperience.tsx`
- Modify: `src/components/__tests__/ChallengeCard.test.tsx`
- Modify: `src/components/__tests__/VerificationExperience.test.tsx`

- [ ] **Step 1: Write the failing audio and terminal-state tests**

```ts
// src/lib/__tests__/audio-controller.test.ts
import { vi } from 'vitest'
import { ChallengeAudioController } from '@/src/lib/audio-controller'

describe('ChallengeAudioController', () => {
  it('fades audio in to 60 percent and then fades it back out', async () => {
    vi.useFakeTimers()

    const audio = {
      volume: 0,
      currentTime: 0,
      loop: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn()
    }

    const controller = new ChallengeAudioController(() => audio)

    await controller.start('/1.mp3')
    vi.advanceTimersByTime(1000)

    expect(audio.play).toHaveBeenCalled()
    expect(audio.volume).toBe(0.6)

    controller.stop()
    vi.advanceTimersByTime(1000)

    expect(audio.pause).toHaveBeenCalled()
    expect(audio.volume).toBe(0)

    vi.useRealTimers()
  })
})
```

```tsx
// src/components/__tests__/ChallengeCard.test.tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChallengeCard } from '@/src/components/ChallengeCard'
import type { PublicRound } from '@/src/lib/challenge-types'

const round: PublicRound = {
  roundId: 'round-01',
  prompt: '请选择唯一真实照片',
  options: Array.from({ length: 9 }, (_, index) => ({
    id: `option-${index + 1}`,
    imageUrl: `https://example.com/${index + 1}.png`,
    alt: `Round one option ${index + 1}`
  }))
}

describe('ChallengeCard', () => {
  it('shows an inline reload message after an image error and blocks submission', async () => {
    const user = userEvent.setup()

    render(
      <ChallengeCard
        round={round}
        selectedOptionId="option-1"
        isSubmitting={false}
        errorMessage={null}
        onSelect={vi.fn()}
        onSubmit={vi.fn()}
      />
    )

    fireEvent.error(screen.getAllByRole('img')[0])

    expect(screen.getByText('图像加载失败，请重新载入此轮')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '验证' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '重新载入' }))

    expect(screen.queryByText('图像加载失败，请重新载入此轮')).not.toBeInTheDocument()
  })
})
```

```tsx
// src/components/__tests__/VerificationExperience.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VerificationExperience } from '@/src/components/VerificationExperience'

describe('VerificationExperience terminal states', () => {
  const audioController = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn()
  }

  const redirectSpy = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    audioController.start.mockClear()
    audioController.stop.mockClear()
    redirectSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('renders the success state and redirects after a short delay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 1,
            requiredPassCount: 1
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 1,
            requiredPassCount: 1,
            sessionId: 'sess_123',
            currentRoundIndex: 1,
            round: {
              roundId: 'round-01',
              prompt: '请选择唯一真实照片',
              options: Array.from({ length: 9 }, (_, index) => ({
                id: `option-${index + 1}`,
                imageUrl: `https://example.com/${index + 1}.png`,
                alt: `Round one option ${index + 1}`
              }))
            }
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'passed',
            correctCount: 1,
            mistakeCount: 0,
            redirectUrl: 'https://www.spark-app.store'
          })
        )
      )

    render(<VerificationExperience audioController={audioController} onRedirect={redirectSpy} />)

    await user.click(await screen.findByRole('button', { name: '我是人类' }))
    await user.click(await screen.findByRole('button', { name: 'Round one option 1' }))
    await user.click(screen.getByRole('button', { name: '验证' }))

    expect(await screen.findByText('验证通过')).toBeInTheDocument()

    vi.advanceTimersByTime(1300)

    expect(redirectSpy).toHaveBeenCalledWith('https://www.spark-app.store')
    expect(audioController.start).toHaveBeenCalledWith('/1.mp3')
    expect(audioController.stop).toHaveBeenCalled()
  })

  it('keeps the selected option when answer submission times out', async () => {
    const user = userEvent.setup()

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 10,
            requiredPassCount: 7
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 10,
            requiredPassCount: 7,
            sessionId: 'sess_123',
            currentRoundIndex: 1,
            round: {
              roundId: 'round-01',
              prompt: '请选择唯一真实照片',
              options: Array.from({ length: 9 }, (_, index) => ({
                id: `option-${index + 1}`,
                imageUrl: `https://example.com/${index + 1}.png`,
                alt: `Round one option ${index + 1}`
              }))
            }
          })
        )
      )
      .mockRejectedValueOnce(new Error('timeout'))

    render(<VerificationExperience audioController={audioController} onRedirect={redirectSpy} />)

    await user.click(await screen.findByRole('button', { name: '我是人类' }))
    await user.click(await screen.findByRole('button', { name: 'Round one option 1' }))
    await user.click(screen.getByRole('button', { name: '验证' }))

    expect(await screen.findByText('验证请求超时，请重试')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Round one option 1' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '验证' })).toBeEnabled()
  })

  it('returns to the shell when the session expires', async () => {
    const user = userEvent.setup()

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 10,
            requiredPassCount: 7
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            brandName: 'Groundflare',
            displaySiteName: 'www.spark-app.store',
            successRedirectUrl: 'https://www.spark-app.store',
            audioUrl: '/1.mp3',
            totalRounds: 10,
            requiredPassCount: 7,
            sessionId: 'sess_123',
            currentRoundIndex: 1,
            round: {
              roundId: 'round-01',
              prompt: '请选择唯一真实照片',
              options: Array.from({ length: 9 }, (_, index) => ({
                id: `option-${index + 1}`,
                imageUrl: `https://example.com/${index + 1}.png`,
                alt: `Round one option ${index + 1}`
              }))
            }
          })
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'expired',
            message: '验证已过期，请重新开始'
          })
        )
      )

    render(<VerificationExperience audioController={audioController} onRedirect={redirectSpy} />)

    await user.click(await screen.findByRole('button', { name: '我是人类' }))
    await user.click(await screen.findByRole('button', { name: 'Round one option 1' }))
    await user.click(screen.getByRole('button', { name: '验证' }))

    expect(await screen.findByText('验证已过期，请重新开始')).toBeInTheDocument()
    expect(screen.getByText('www.spark-app.store')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the audio and terminal-state tests to verify they fail**

Run: `npm exec vitest run src/lib/__tests__/audio-controller.test.ts src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx`
Expected: FAIL because the audio controller, result view, reload affordance, redirect timer, and expiry handling details are incomplete.

- [ ] **Step 3: Implement audio control, result states, and the remaining recovery behavior**

```ts
// src/lib/audio-controller.ts
export interface ManagedAudio {
  volume: number
  currentTime: number
  loop: boolean
  play: () => Promise<void>
  pause: () => void
}

export interface AudioControllerPort {
  start: (src: string) => Promise<void>
  stop: () => void
}

export class ChallengeAudioController implements AudioControllerPort {
  private audio: ManagedAudio | null = null
  private fadeTimer: ReturnType<typeof setInterval> | null = null

  constructor(private readonly createAudio: (src: string) => ManagedAudio = (src) => new Audio(src)) {}

  async start(src: string) {
    this.clearFadeTimer()

    this.audio = this.createAudio(src)
    this.audio.loop = true
    this.audio.currentTime = 0
    this.audio.volume = 0

    try {
      await this.audio.play()
    } catch {
      return
    }

    this.fadeTimer = setInterval(() => {
      if (!this.audio) {
        this.clearFadeTimer()
        return
      }

      this.audio.volume = Math.min(0.6, Number((this.audio.volume + 0.1).toFixed(2)))

      if (this.audio.volume >= 0.6) {
        this.clearFadeTimer()
      }
    }, 120)
  }

  stop() {
    if (!this.audio) {
      return
    }

    this.clearFadeTimer()

    this.fadeTimer = setInterval(() => {
      if (!this.audio) {
        this.clearFadeTimer()
        return
      }

      this.audio.volume = Math.max(0, Number((this.audio.volume - 0.1).toFixed(2)))

      if (this.audio.volume === 0) {
        this.audio.pause()
        this.audio.currentTime = 0
        this.clearFadeTimer()
      }
    }, 80)
  }

  private clearFadeTimer() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer)
      this.fadeTimer = null
    }
  }
}
```

```tsx
// src/components/ResultCard.tsx
interface ResultCardProps {
  status: 'passed' | 'failed'
  onRetry?: () => void
}

export function ResultCard({ status, onRetry }: ResultCardProps) {
  return (
    <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">
        {status === 'passed' ? '验证通过' : '你不是人类！'}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        {status === 'passed'
          ? '系统已确认当前验证会话通过，正在跳转到目标站点。'
          : '当前验证会话未通过。请重新开始新的验证流程。'}
      </p>

      {status === 'failed' ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900"
        >
          重新验证
        </button>
      ) : null}
    </section>
  )
}
```

```tsx
// src/components/ChallengeCard.tsx
'use client'

import { useMemo, useState } from 'react'
import type { PublicRound } from '@/src/lib/challenge-types'

interface ChallengeCardProps {
  round: PublicRound
  selectedOptionId: string | null
  isSubmitting: boolean
  errorMessage: string | null
  onSelect: (optionId: string) => void
  onSubmit: () => void
}

export function ChallengeCard({
  round,
  selectedOptionId,
  isSubmitting,
  errorMessage,
  onSelect,
  onSubmit
}: ChallengeCardProps) {
  const [failedImageIds, setFailedImageIds] = useState<string[]>([])
  const hasImageError = failedImageIds.length > 0

  const buttonDisabled = useMemo(() => {
    return !selectedOptionId || isSubmitting || hasImageError
  }, [selectedOptionId, isSubmitting, hasImageError])

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="bg-blue-600 px-4 py-3 text-white">
        <p className="text-sm font-semibold">{round.prompt}</p>
        <p className="mt-1 text-xs text-blue-100">请从下方 9 张图像中选出真实拍摄的图片</p>
      </header>

      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 sm:gap-3">
        {round.options.map((option) => {
          const isSelected = option.id === selectedOptionId

          return (
            <button
              key={option.id}
              type="button"
              aria-label={option.alt}
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
              className={[
                'group overflow-hidden rounded-md border bg-white',
                isSelected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-400'
              ].join(' ')}
            >
              <img
                src={option.imageUrl}
                alt={option.alt}
                className="aspect-square h-full w-full object-cover"
                onError={() => {
                  setFailedImageIds((current) => (current.includes(option.id) ? current : [...current, option.id]))
                }}
              />
            </button>
          )
        })}
      </div>

      <footer className="space-y-3 border-t border-slate-200 px-4 py-3">
        {hasImageError ? <p className="text-sm text-red-600">图像加载失败，请重新载入此轮</p> : null}
        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFailedImageIds([])}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900"
          >
            重新载入
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={buttonDisabled}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? '验证中...' : '验证'}
          </button>
        </div>
      </footer>
    </section>
  )
}
```

```ts
// src/hooks/useChallengeFlow.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChallengeViewState, PublicChallengeConfig, PublicRound } from '@/src/lib/challenge-types'
import { submitChallengeAnswer, fetchPublicConfig, startChallenge } from '@/src/lib/api-client'
import { AudioControllerPort, ChallengeAudioController } from '@/src/lib/audio-controller'

const FALLBACK_CONFIG: PublicChallengeConfig = {
  brandName: 'Groundflare',
  displaySiteName: 'www.spark-app.store',
  successRedirectUrl: 'https://www.spark-app.store',
  audioUrl: '/1.mp3',
  totalRounds: 10,
  requiredPassCount: 7
}

export function useChallengeFlow(audioController?: AudioControllerPort) {
  const [viewState, setViewState] = useState<ChallengeViewState>('loading')
  const [config, setConfig] = useState<PublicChallengeConfig>(FALLBACK_CONFIG)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [round, setRound] = useState<PublicRound | null>(null)
  const [currentRoundIndex, setCurrentRoundIndex] = useState(1)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [remainingMistakesBeforeFailure, setRemainingMistakesBeforeFailure] = useState(4)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const audioControllerRef = useRef<AudioControllerPort | null>(null)

  if (!audioControllerRef.current) {
    audioControllerRef.current = audioController ?? new ChallengeAudioController()
  }

  useEffect(() => {
    async function loadConfig() {
      try {
        const nextConfig = await fetchPublicConfig()
        setConfig(nextConfig)
        setRemainingMistakesBeforeFailure(nextConfig.totalRounds - nextConfig.requiredPassCount + 1)
        setViewState('readyToVerify')
      } catch {
        setErrorMessage('验证初始化失败，请稍后重试')
        setViewState('readyToVerify')
      }
    }

    void loadConfig()
  }, [])

  async function startVerification() {
    setErrorMessage(null)

    try {
      const started = await startChallenge()
      setConfig(started)
      setSessionId(started.sessionId)
      setRound(started.round)
      setCurrentRoundIndex(started.currentRoundIndex)
      setMistakeCount(0)
      setRemainingMistakesBeforeFailure(started.totalRounds - started.requiredPassCount + 1)
      setSelectedOptionId(null)
      setRedirectUrl(null)
      setViewState('inChallenge')

      try {
        await audioControllerRef.current?.start(started.audioUrl)
      } catch {
        // Audio failure is a silent degradation, not a challenge-start failure.
      }
    } catch {
      setErrorMessage('验证启动失败，请重试')
      setViewState('readyToVerify')
    }
  }

  async function submitSelection() {
    if (!sessionId || !round || !selectedOptionId) {
      return
    }

    setViewState('submitting')
    setErrorMessage(null)

    try {
      const response = await submitChallengeAnswer({
        sessionId,
        roundId: round.roundId,
        selectedOptionId
      })

      if (response.status === 'continue') {
        setRound(response.round)
        setCurrentRoundIndex(response.currentRoundIndex)
        setMistakeCount(response.mistakeCount)
        setRemainingMistakesBeforeFailure(response.remainingMistakesBeforeFailure)
        setSelectedOptionId(null)
        setViewState('inChallenge')
        return
      }

      if (response.status === 'expired') {
        audioControllerRef.current?.stop()
        setSessionId(null)
        setRound(null)
        setSelectedOptionId(null)
        setErrorMessage(response.message)
        setViewState('readyToVerify')
        return
      }

      audioControllerRef.current?.stop()
      setMistakeCount(response.mistakeCount)
      setRedirectUrl(response.status === 'passed' ? response.redirectUrl : null)
      setViewState(response.status)
    } catch {
      setErrorMessage('验证请求超时，请重试')
      setViewState('inChallenge')
    }
  }

  function restartVerification() {
    audioControllerRef.current?.stop()
    setSessionId(null)
    setRound(null)
    setSelectedOptionId(null)
    setCurrentRoundIndex(1)
    setMistakeCount(0)
    setRemainingMistakesBeforeFailure(config.totalRounds - config.requiredPassCount + 1)
    setErrorMessage(null)
    setRedirectUrl(null)
    setViewState('readyToVerify')
  }

  return {
    config,
    viewState,
    round,
    currentRoundIndex,
    mistakeCount,
    remainingMistakesBeforeFailure,
    selectedOptionId,
    errorMessage,
    redirectUrl,
    setSelectedOptionId,
    startVerification,
    submitSelection,
    restartVerification
  }
}
```

```tsx
// src/components/VerificationExperience.tsx
'use client'

import { useEffect } from 'react'
import type { AudioControllerPort } from '@/src/lib/audio-controller'
import { ChallengeCard } from '@/src/components/ChallengeCard'
import { ChallengeStatusPanel } from '@/src/components/ChallengeStatusPanel'
import { ResultCard } from '@/src/components/ResultCard'
import { VerificationShell } from '@/src/components/VerificationShell'
import { useChallengeFlow } from '@/src/hooks/useChallengeFlow'

interface VerificationExperienceProps {
  audioController?: AudioControllerPort
  onRedirect?: (url: string) => void
}

export function VerificationExperience({
  audioController,
  onRedirect = (url) => window.location.assign(url)
}: VerificationExperienceProps) {
  const {
    config,
    viewState,
    round,
    currentRoundIndex,
    mistakeCount,
    remainingMistakesBeforeFailure,
    selectedOptionId,
    errorMessage,
    redirectUrl,
    setSelectedOptionId,
    startVerification,
    submitSelection,
    restartVerification
  } = useChallengeFlow(audioController)

  useEffect(() => {
    if (viewState !== 'passed' || !redirectUrl) {
      return
    }

    const timer = window.setTimeout(() => {
      onRedirect(redirectUrl)
    }, 1200)

    return () => window.clearTimeout(timer)
  }, [onRedirect, redirectUrl, viewState])

  if (viewState === 'loading' || viewState === 'readyToVerify') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <VerificationShell
          brandName={config.brandName}
          displaySiteName={config.displaySiteName}
          canStart={viewState === 'readyToVerify'}
          progressPercent={62}
          errorMessage={errorMessage}
          onStart={startVerification}
        />
      </main>
    )
  }

  if (viewState === 'passed') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <ResultCard status="passed" />
      </main>
    )
  }

  if (viewState === 'failed') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <ResultCard status="failed" onRetry={restartVerification} />
      </main>
    )
  }

  if (!round) {
    return null
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]" data-testid="challenge-layout">
        <ChallengeCard
          round={round}
          selectedOptionId={selectedOptionId}
          isSubmitting={viewState === 'submitting'}
          errorMessage={errorMessage}
          onSelect={setSelectedOptionId}
          onSubmit={submitSelection}
        />

        <ChallengeStatusPanel
          currentRoundIndex={currentRoundIndex}
          totalRounds={config.totalRounds}
          mistakeCount={mistakeCount}
          remainingMistakesBeforeFailure={remainingMistakesBeforeFailure}
          requiredPassCount={config.requiredPassCount}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Run the audio and terminal-state tests to verify they pass**

Run: `npm exec vitest run src/lib/__tests__/audio-controller.test.ts src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full verification suite**

Run: `npm run test && npm run build`
Expected: all Vitest suites pass, then Next.js production build completes successfully.

- [ ] **Step 6: Commit the finishing task**

```bash
git add src/lib/audio-controller.ts src/lib/__tests__/audio-controller.test.ts src/components/ResultCard.tsx src/components/ChallengeCard.tsx src/components/VerificationExperience.tsx src/hooks/useChallengeFlow.ts src/components/__tests__/ChallengeCard.test.tsx src/components/__tests__/VerificationExperience.test.tsx
git commit -m "feat: finish Groundflare verification flow"
```

## Self-Review

### Spec Coverage Check

- Public verification shell: covered in Task 1 and Task 4
- `www.spark-app.store` as backend-configured display name: covered in Task 2 and Task 3
- Separate display name and redirect URL: covered in Task 2 and Task 3
- 10 rounds, 7 required passes, fourth wrong answer failure: covered in Task 2 tests and Task 4 status rendering
- Audio starts only after clicking `我是人类`: covered in Task 5 hook and audio controller
- Success terminal state and redirect: covered in Task 5
- Failure terminal state and restart: covered in Task 5
- Image load, timeout, and expiry recovery: covered in Task 5 tests and UI behavior
- Desktop/mobile layout expectations: covered in Task 4 `challenge-layout` structure and retained in Task 5

### Placeholder Scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- All task steps include exact file paths, commands, and code.

### Type Consistency Check

- `displaySiteName`, `successRedirectUrl`, `audioUrl`, `totalRounds`, and `requiredPassCount` are used consistently across config, service, client, and tests.
- `remainingMistakesBeforeFailure` is the only remaining-chances field used in API and UI.
- Terminal view states are consistently named `passed`, `failed`, and `expired`.

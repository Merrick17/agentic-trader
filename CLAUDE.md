# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Read it fully before writing any code, suggesting any architecture, or modifying any existing file.

---

## Project Overview

This is an **Agentic Trader** — an autonomous crypto trading agent that identifies high-probability
trades on Solana using real-time data from DexScreener, PumpFun, and Birdeye. It features auto-RAG
learning, smart wallet tracking, and a production-grade Next.js dashboard for monitoring trades,
signals, and performance analytics.

> **Critical:** This project uses Next.js 16 with significant breaking changes from earlier versions.
> Always refer to the local documentation in `node_modules/next/dist/docs/` rather than external
> Next.js documentation. See `AGENTS.md` for the specific warning about API differences.

### Stack at a glance

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| React | 19.2.4 (React Server Components) |
| Language | TypeScript 5.x (strict mode) |
| Styling | Tailwind CSS 4.x + shadcn/ui |
| AI SDK | Vercel AI SDK |
| LLM | Groq (llama-3.3-70b-versatile) |
| Database | Astra DB (DataStax — Cassandra + vector) |
| Auth | Clerk |
| Deployment | Vercel |

---

## Common Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Linting (ESLint v9 flat config)
npm run lint

# Type check
npm run type-check

# Install a shadcn component
npx shadcn@latest add <component>
```

---

## Repository Structure

```
/
├── CLAUDE.md                        ← you are here
├── AGENTS.md                        ← Next.js v16 API warnings
├── .env.local                       ← never commit this
├── next.config.ts                   ← Next.js config (TypeScript)
├── tailwind.config.ts
├── components.json                  ← shadcn/ui config
├── eslint.config.mjs                ← ESLint v9 flat config
├── tsconfig.json
├── postcss.config.mjs               ← @tailwindcss/postcss plugin
│
├── app/                             ← App Router directory
│   ├── layout.tsx                   ← root layout, Geist font, providers
│   ├── page.tsx                     ← home (redirects to /dashboard)
│   ├── globals.css                  ← Tailwind v4 + CSS variables
│   ├── favicon.ico
│   │
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx               ← sidebar + topbar shell
│   │   ├── dashboard/page.tsx       ← overview cards + live feed
│   │   ├── signals/page.tsx         ← live signal stream
│   │   ├── trades/page.tsx          ← trade history + P&L
│   │   ├── portfolio/page.tsx       ← positions + allocation
│   │   ├── analytics/page.tsx       ← performance charts
│   │   ├── wallets/page.tsx         ← smart wallet tracker
│   │   └── settings/page.tsx        ← agent config, risk params
│   │
│   └── api/
│       ├── agent/route.ts           ← POST — main agent loop (streaming)
│       ├── signals/route.ts         ← GET — fetch recent signals
│       ├── trades/route.ts          ← GET/POST trades
│       ├── portfolio/route.ts       ← GET portfolio snapshot
│       ├── rag/
│       │   ├── query/route.ts       ← POST — vector similarity search
│       │   └── ingest/route.ts      ← POST — store trade outcome
│       └── webhooks/
│           └── clerk/route.ts
│
├── components/
│   ├── ui/                          ← shadcn/ui primitives (auto-generated — do not edit manually)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── mobile-nav.tsx
│   ├── dashboard/
│   │   ├── stats-card.tsx
│   │   ├── live-signal-feed.tsx
│   │   ├── pnl-chart.tsx
│   │   └── recent-trades-table.tsx
│   ├── signals/
│   │   ├── signal-card.tsx
│   │   ├── signal-score-badge.tsx
│   │   └── signal-filters.tsx
│   ├── trades/
│   │   ├── trade-row.tsx
│   │   └── trade-detail-sheet.tsx
│   ├── agent/
│   │   ├── agent-chat.tsx           ← streaming AI chat panel
│   │   ├── agent-status.tsx
│   │   └── reasoning-trace.tsx      ← step-by-step agent thinking
│   └── charts/
│       ├── candlestick-chart.tsx    ← TradingView Lightweight Charts
│       ├── volume-chart.tsx
│       └── portfolio-pie.tsx
│
├── lib/
│   ├── astra/
│   │   ├── client.ts               ← AstraDB connection singleton
│   │   ├── collections.ts          ← collection name constants
│   │   ├── queries.ts              ← all DB query functions
│   │   └── vector.ts               ← RAG vector operations
│   ├── agent/
│   │   ├── tools.ts                ← Vercel AI SDK tool definitions
│   │   ├── system-prompt.ts        ← master system prompt
│   │   └── scoring.ts              ← signal scoring logic
│   ├── data/
│   │   ├── dexscreener.ts          ← DexScreener API wrapper
│   │   ├── birdeye.ts              ← Birdeye API wrapper
│   │   ├── pumpfun.ts              ← PumpFun API wrapper
│   │   └── onchain.ts              ← Solana on-chain helpers
│   └── utils.ts                    ← shared utilities + cn()
│
├── hooks/
│   ├── use-signals.ts              ← real-time signal polling
│   ├── use-trades.ts
│   ├── use-portfolio.ts
│   └── use-agent-stream.ts         ← SSE / streaming agent responses
│
├── types/
│   ├── signal.ts
│   ├── trade.ts
│   ├── portfolio.ts
│   └── agent.ts
│
└── public/
    ├── next.svg
    ├── vercel.svg
    └── ...
```

---

## App Router Conventions

> For accurate API information, always consult local Next.js documentation:
> - `node_modules/next/dist/docs/01-app/` — App Router guides and API reference
> - `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` — full file conventions
>
> Do **not** rely on nextjs.org — APIs have changed in v16.

### File conventions

| File | Purpose |
|---|---|
| `page.tsx` | Exposes a route publicly |
| `layout.tsx` | Shared UI wrapper (root layout wraps all routes) |
| `loading.tsx` | Loading UI (React Suspense boundary) |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 UI |
| `route.ts` | API endpoint |
| `template.tsx` | Re-rendered layout (no state persistence between navigations) |

### Dynamic routes

| Pattern | Meaning |
|---|---|
| `[slug]/page.tsx` | Single dynamic segment |
| `[...slug]/page.tsx` | Catch-all segments |
| `[[...slug]]/page.tsx` | Optional catch-all |

### Route organization

- **Route groups:** `(folder)/` — organize without affecting URL path
- **Private folders:** `_folder/` — not routable, for colocating utilities

### Server vs Client components

| Needs | Use |
|---|---|
| DB access, secrets, heavy logic | Server Component or Route Handler |
| `useState`, `useEffect`, browser events | Client Component (`'use client'`) |
| Both | Split: parent Server fetches, child Client renders |

All pages use the App Router. Never use the `pages/` directory.
Data fetching happens in Server Components or Route Handlers — never fetch Astra DB from the client.
Add `'use client'` only when strictly required.

---

## Environment Variables

All secrets live in `.env.local`. Never hardcode values. Never commit `.env.local`.

```bash
# Astra DB
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
ASTRA_DB_API_ENDPOINT=https://<db-id>-<region>.apps.astra.datastax.com
ASTRA_DB_NAMESPACE=trading_agent

# Groq
GROQ_API_KEY=gsk_...

# Data APIs
DEXSCREENER_API_KEY=...           # optional — public endpoints exist
BIRDEYE_API_KEY=...
HELIUS_API_KEY=...                # Solana RPC + webhooks

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Astra DB Schema

We use **Astra DB** (DataStax) — a managed Cassandra + vector database — via the
`@datastax/astra-db-ts` client. All collections live in the `trading_agent` namespace (keyspace).

### Connection singleton — `lib/astra/client.ts`

```typescript
import { DataAPIClient } from '@datastax/astra-db-ts';

let client: DataAPIClient | null = null;

export function getAstraClient() {
  if (!client) {
    client = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
  }
  return client;
}

export function getDb() {
  return getAstraClient().db(process.env.ASTRA_DB_API_ENDPOINT!, {
    namespace: process.env.ASTRA_DB_NAMESPACE!,
  });
}
```

### Collections

#### `signals`
Every signal the agent evaluates — acted on or not.

```typescript
interface Signal {
  _id: string;
  token: string;                // e.g. "BONK"
  pair: string;                 // e.g. "BONK/SOL"
  strategy: string;
  score: number;                // 0–100
  decision: 'ENTER' | 'PASS' | 'WATCH';
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward: number;
  chart_read: { h4: string; m15: string; m5: string };
  smart_money: string;
  volume_data: Record<string, unknown>;
  thesis: string;
  rag_match: string;
  created_at: string;           // ISO timestamp
  user_id: string;
}
```

Create: `await db.createCollection('signals')`

#### `trades`
Executed trades and their outcomes.

```typescript
interface Trade {
  _id: string;
  signal_id: string;            // FK → signals._id
  token: string;
  pair: string;
  strategy: string;
  entry_price: number;
  exit_price: number | null;
  position_size_pct: number;
  status: 'OPEN' | 'CLOSED' | 'STOPPED';
  pnl_usd: number | null;
  pnl_pct: number | null;
  entry_at: string;
  exit_at: string | null;
  exit_reason: 'TP1' | 'TP2' | 'TRAIL' | 'STOP' | 'MANUAL' | null;
  lessons: string;              // post-trade notes fed into RAG
  user_id: string;
}
```

Create: `await db.createCollection('trades')`

#### `rag_memory` — vector-enabled
The auto-RAG knowledge store. Every trade outcome is embedded and stored here.
Vector dimension: **1536** (cosine similarity).

```typescript
interface RagMemory {
  _id: string;
  $vector: number[];            // 1536-dim embedding of `content`
  content: string;              // full trade context as natural language
  type: 'trade_outcome' | 'pattern' | 'strategy_note' | 'market_regime';
  metadata: {
    token?: string;
    strategy?: string;
    outcome?: 'win' | 'loss' | 'breakeven';
    pnl_pct?: number;
    score?: number;
    created_at: string;
  };
  user_id: string;
}
```

Create with vector support:
```typescript
await db.createCollection('rag_memory', {
  vector: { dimension: 1536, metric: 'cosine' },
});
```

#### `portfolio`
Current positions and account snapshots.

```typescript
interface PortfolioSnapshot {
  _id: string;
  total_value_usd: number;
  available_usd: number;
  positions: Array<{
    token: string;
    pair: string;
    size_usd: number;
    entry_price: number;
    current_price: number;
    unrealized_pnl_usd: number;
    unrealized_pnl_pct: number;
  }>;
  daily_pnl_usd: number;
  daily_pnl_pct: number;
  total_pnl_usd: number;
  win_rate: number;
  snapshotted_at: string;
  user_id: string;
}
```

#### `smart_wallets`
Tracked profitable wallets.

```typescript
interface SmartWallet {
  _id: string;
  address: string;
  label: string;
  win_rate: number;
  avg_pnl_pct: number;
  total_trades: number;
  last_seen_at: string;
  current_positions: string[];
  user_id: string;
}
```

### Query patterns — `lib/astra/queries.ts`

Always use typed wrappers. Never write raw queries inline in route handlers.

```typescript
// Get recent signals (last 50, scoped to user)
export async function getRecentSignals(userId: string): Promise<Signal[]> {
  const col = getDb().collection<Signal>('signals');
  const cursor = col.find(
    { user_id: userId },
    { sort: { created_at: -1 }, limit: 50 }
  );
  return cursor.toArray();
}

// Insert a new signal
export async function insertSignal(signal: Omit<Signal, '_id'>): Promise<string> {
  const col = getDb().collection<Signal>('signals');
  const result = await col.insertOne({ ...signal, _id: crypto.randomUUID() });
  return result.insertedId;
}

// Vector similarity search for RAG
export async function queryRagMemory(
  embedding: number[],
  userId: string,
  limit = 5
): Promise<RagMemory[]> {
  const col = getDb().collection<RagMemory>('rag_memory');
  const cursor = col.find(
    { user_id: userId },
    { sort: { $vector: embedding }, limit, includeSimilarity: true }
  );
  return cursor.toArray();
}
```

---

## Agent — Vercel AI SDK + Groq

### Streaming route handler — `app/api/agent/route.ts`

```typescript
import { streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { auth } from '@clerk/nextjs/server';
import { agentTools } from '@/lib/agent/tools';
import { SYSTEM_PROMPT } from '@/lib/agent/system-prompt';

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: SYSTEM_PROMPT,
    messages,
    tools: agentTools(userId),
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}
```

### Agent tools — `lib/agent/tools.ts`

Tools are the agent's only way to access live data or write to the database.

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const agentTools = (userId: string) => ({
  fetchDexScreenerPair: tool({
    description: 'Fetch real-time price, volume, and liquidity for a token pair',
    parameters: z.object({
      pairAddress: z.string().describe('The DEX pair contract address'),
    }),
    execute: async ({ pairAddress }) => fetchDexScreenerPair(pairAddress),
  }),

  fetchBirdeyeChart: tool({
    description: 'Fetch OHLCV candlestick data for chart analysis',
    parameters: z.object({
      tokenAddress: z.string(),
      timeframe: z.enum(['1m', '5m', '15m', '1h', '4h', '1d']),
      limit: z.number().min(20).max(200).default(100),
    }),
    execute: async ({ tokenAddress, timeframe, limit }) =>
      fetchBirdeyeOHLCV(tokenAddress, timeframe, limit),
  }),

  fetchPumpFunToken: tool({
    description: 'Get PumpFun token launch data, bonding curve progress, and holder info',
    parameters: z.object({ tokenAddress: z.string() }),
    execute: async ({ tokenAddress }) => fetchPumpFunToken(tokenAddress),
  }),

  queryRagMemory: tool({
    description: 'Search RAG memory for similar historical trade patterns and outcomes',
    parameters: z.object({
      query: z.string().describe('Natural language description of the current setup'),
      limit: z.number().default(5),
    }),
    execute: async ({ query, limit }) => {
      const embedding = await getEmbedding(query);
      return queryRagMemory(embedding, userId, limit);
    },
  }),

  logSignal: tool({
    description: 'Log a scored trade signal to the database',
    parameters: z.object({
      token: z.string(),
      pair: z.string(),
      strategy: z.string(),
      score: z.number().min(0).max(100),
      decision: z.enum(['ENTER', 'PASS', 'WATCH']),
      entry_price: z.number(),
      stop_loss: z.number(),
      take_profit_1: z.number(),
      take_profit_2: z.number(),
      risk_reward: z.number(),
      thesis: z.string(),
    }),
    execute: async (signal) =>
      insertSignal({ ...signal, user_id: userId, created_at: new Date().toISOString() }),
  }),

  ingestTradeOutcome: tool({
    description: 'Store a closed trade outcome into RAG memory for future learning',
    parameters: z.object({
      summary: z.string().describe('Full natural language description of the trade and outcome'),
      outcome: z.enum(['win', 'loss', 'breakeven']),
      pnl_pct: z.number(),
    }),
    execute: async ({ summary, outcome, pnl_pct }) => {
      const embedding = await getEmbedding(summary);
      return ingestRagMemory({
        content: summary,
        $vector: embedding,
        type: 'trade_outcome',
        metadata: { outcome, pnl_pct, created_at: new Date().toISOString() },
        user_id: userId,
      });
    },
  }),
});
```

---

## UI — shadcn/ui + Tailwind CSS v4

### Tailwind v4 — key differences from v3

Tailwind v4 uses a new configuration approach. Do not apply v3 patterns:

```css
/* app/globals.css */
@import "tailwindcss";           /* ← new v4 syntax, NOT @tailwind base/components/utilities */

@theme inline {
  --color-background: 0 0% 4%;
  --color-foreground: 0 0% 95%;
  /* ... all theme tokens here */
}
```

PostCSS uses `@tailwindcss/postcss` (not `tailwindcss` directly) — see `postcss.config.mjs`.

### Geist font (root layout)

```tsx
// app/layout.tsx
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
```

### shadcn/ui setup

```bash
npx shadcn@latest init
# Style: Default | Base color: Slate | CSS variables: Yes

# All components used in this project
npx shadcn@latest add button card badge table sheet dialog
npx shadcn@latest add dropdown-menu select tabs scroll-area
npx shadcn@latest add skeleton toast sonner progress chart
```

**Never** edit files inside `components/ui/` manually. Re-run `npx shadcn@latest add` to update.
Use `cn()` from `@/lib/utils` for all conditional class merging.

### Design system

Dark, data-dense terminal aesthetic. Color tokens defined in `app/globals.css`:

```css
:root {
  --background: 0 0% 4%;           /* near black */
  --foreground: 0 0% 95%;
  --card: 0 0% 7%;
  --card-foreground: 0 0% 95%;
  --primary: 142 76% 48%;          /* green — profit / buy */
  --primary-foreground: 0 0% 4%;
  --destructive: 0 84% 60%;        /* red — loss / sell */
  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 55%;
  --border: 0 0% 14%;
  --accent: 43 96% 56%;            /* amber — warning / watch */
}
```

### Key component patterns

#### Stats card
```tsx
// components/dashboard/stats-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
  subtitle?: string;
}

export function StatsCard({ title, value, change, subtitle }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {change !== undefined && (
          <Badge variant={change >= 0 ? 'default' : 'destructive'} className="text-xs">
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-mono font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
```

#### Signal score badge
```tsx
// components/signals/signal-score-badge.tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function SignalScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    score >= 65 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border-red-500/30';

  return (
    <Badge variant="outline" className={cn('font-mono text-xs', color)}>
      {score}/100
    </Badge>
  );
}
```

#### Agent reasoning trace
```tsx
// components/agent/reasoning-trace.tsx
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step { tool?: string; text?: string }

export function ReasoningTrace({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-2 font-mono text-xs">
      {steps.map((step, i) => (
        <Card key={i} className="border-muted bg-muted/30">
          <CardContent className="p-3">
            {step.tool && (
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400/30">
                  TOOL
                </Badge>
                <span className="text-blue-400">{step.tool}</span>
              </div>
            )}
            {step.text && (
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {step.text}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

#### Dashboard layout
```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

### Hooks

#### `hooks/use-agent-stream.ts`
```typescript
'use client';
import { useChat } from 'ai/react';

export function useAgentStream() {
  return useChat({
    api: '/api/agent',
    onError: (err) => console.error('Agent error:', err),
  });
}
```

#### `hooks/use-signals.ts`
```typescript
'use client';
import { useState, useEffect } from 'react';
import type { Signal } from '@/types/signal';

export function useSignals(intervalMs = 10_000) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const res = await fetch('/api/signals');
        if (!res.ok) throw new Error('Failed to fetch');
        setSignals(await res.json());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchSignals();
    const id = setInterval(fetchSignals, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return { signals, loading, error };
}
```

---

## TypeScript Types

### `types/signal.ts`
```typescript
export type Decision = 'ENTER' | 'PASS' | 'WATCH';
export type Strategy =
  | 'pumpfun_migration'
  | 'volume_breakout'
  | 'smart_money_follow'
  | 'dip_buy_uptrend'
  | 'narrative_alpha';

export interface Signal {
  _id: string;
  token: string;
  pair: string;
  strategy: Strategy;
  score: number;
  decision: Decision;
  entry_price: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  risk_reward: number;
  chart_read: { h4: string; m15: string; m5: string };
  smart_money: string;
  volume_data: Record<string, unknown>;
  thesis: string;
  rag_match: string;
  created_at: string;
  user_id: string;
}
```

### `types/trade.ts`
```typescript
export type TradeStatus = 'OPEN' | 'CLOSED' | 'STOPPED';
export type ExitReason = 'TP1' | 'TP2' | 'TRAIL' | 'STOP' | 'MANUAL';

export interface Trade {
  _id: string;
  signal_id: string;
  token: string;
  pair: string;
  strategy: string;
  entry_price: number;
  exit_price: number | null;
  position_size_pct: number;
  status: TradeStatus;
  pnl_usd: number | null;
  pnl_pct: number | null;
  entry_at: string;
  exit_at: string | null;
  exit_reason: ExitReason | null;
  lessons: string;
  user_id: string;
}
```

---

## Coding Standards

### General
- **TypeScript strict mode** is on. Zero `any`. Use `unknown` and narrow with type guards.
- All functions must have explicit return types.
- Use `zod` for all input validation in route handlers.
- Named exports everywhere — default exports only for Next.js pages and layouts.
- Prefer `async/await` over `.then()` chains.
- No `console.log` in production paths.

### Imports
Use the `@/` path alias for all internal imports. No relative `../../` climbing.

```typescript
// ✅ correct
import { getDb } from '@/lib/astra/client';
import type { Signal } from '@/types/signal';

// ❌ wrong
import { getDb } from '../../../lib/astra/client';
```

### Route handler pattern

```typescript
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const data = await getRecentSignals(userId);   // always scoped to userId
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/signals]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

For streaming AI responses, return `result.toDataStreamResponse()` — **never** `NextResponse.json()`.

### Astra DB rules
- Always use the typed collection generic: `getDb().collection<Signal>('signals')`
- Always pass `limit` to `.find()` — never fetch unbounded result sets.
- Vector upserts must always include both `$vector` and `content`.
- AstraDB returns `null` for missing docs — handle gracefully, don't expect thrown errors.

---

## Security Rules

- Never expose `ASTRA_DB_APPLICATION_TOKEN` or `GROQ_API_KEY` to the client.
- All route handlers must verify the Clerk session before any DB access.
- Always scope DB queries to `user_id` — never return data across users.
- Sanitize all token addresses before passing to external APIs (alphanumeric + base58 only).
- Rate-limit `/api/agent` — one concurrent stream per user.
- Never call DexScreener, Birdeye, or PumpFun from the browser — always proxy via `/api`.

---

## External API Reference

### DexScreener
- Base URL: `https://api.dexscreener.com/latest/dex`
- Rate limit: 300 req/min (unauthenticated)
- Key endpoints: `/pairs/solana/{pairAddress}`, `/search?q={query}`
- Cache responses minimum 10s.

### Birdeye
- Base URL: `https://public-api.birdeye.so`
- Auth: `X-API-KEY: {BIRDEYE_API_KEY}` header
- Key endpoints: `/defi/ohlcv`, `/defi/token_overview`, `/trader/gainers-losers`
- Request at least 100 candles for accurate technical analysis.

### PumpFun
- Base URL: `https://frontend-api.pump.fun`
- No official API key — cache aggressively.
- Key endpoints: `/coins/{tokenAddress}`, `/coins?sort=created_timestamp&order=DESC`
- Watch `usd_market_cap` and `bonding_curve_progress` fields.

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Fetching Astra DB from a Client Component | Move to Server Component or `/api` route |
| Missing `'use client'` on a hooks file | Add directive at top of file |
| Using Tailwind v3 `@tailwind base` syntax | Use `@import "tailwindcss"` (v4) |
| AstraDB vector insert missing `$vector` | Always include both `$vector` and `content` |
| Streaming response not working | Return `result.toDataStreamResponse()`, not `NextResponse.json()` |
| shadcn component not rendering correctly | Run `npx shadcn@latest add <component>` — never write manually |
| Unbounded AstraDB query | Always pass `limit` to `.find()` |
| External API called from the browser | Proxy via an `/api` route handler |
| Groq rate limit in long agent loops | Keep `maxSteps ≤ 10`, cache tool outputs where safe |
| Using Next.js v14/v15 APIs | Check `node_modules/next/dist/docs/` — v16 APIs differ |

---

## Reference Documentation

Always consult local documentation — not external sites:

- `node_modules/next/dist/docs/01-app/` — App Router guides and API reference
- `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` — file conventions

---

*Keep this file in sync whenever the stack, schema, or conventions change.*
# Agentic Trader

An autonomous AI-powered crypto trading agent for Solana that scans markets, analyzes tokens, and executes trades automatically. Built with Next.js 16, Groq AI, and Astra DB.

![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLM-green)
![Solana](https://img.shields.io/badge/Solana-Crypto-purple?logo=solana&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Autonomous Trading Agent** - Scans Solana markets 24/7 for high-probability trading opportunities
- **AI-Powered Analysis** - Uses Groq's Llama 3.3 70B for real-time token analysis and trade decisions
- **Multi-Source Data** - Aggregates data from DexScreener, Birdeye, Jupiter, and PumpFun
- **RAG Learning System** - Learns from past trades using vector similarity search in Astra DB
- **Smart Wallet Tracking** - Monitor and follow profitable trader wallets
- **Configurable Risk Management** - Set stop losses, take profits, position sizes, and confidence thresholds
- **Real-Time Dashboard** - Live trading feed, P&L tracking, and performance analytics
- **User-Configurable Settings** - Full control over agent behavior via UI or API

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Autonomous Agent Loop                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Scanner   │→ │  Analyzer   │→ │  Trade Executor     │  │
│  │  (60s interval)│ │  (Deep dive) │ │  (Jupiter swaps)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         ↑                                      │            │
│         │                                      ↓            │
│  ┌─────────────┐                      ┌─────────────────┐   │
│  │  DexScreener│                      │  RAG Memory     │   │
│  │  Birdeye    │                      │  (Learning)     │   │
│  │  Jupiter    │                      └─────────────────┘   │
│  │  PumpFun    │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                               |
| ---------- | ---------------------------------------- |
| Framework  | Next.js 16.2.1 (App Router)              |
| React      | 19.2.4 (Server Components)               |
| Language   | TypeScript 5.x (strict mode)             |
| Styling    | Tailwind CSS 4.x + shadcn/ui             |
| AI SDK     | Vercel AI SDK                            |
| LLM        | Groq (llama-3.3-70b-versatile)           |
| Database   | Astra DB (DataStax - Cassandra + vector) |
| Auth       | Clerk / Solana wallet                    |
| Deployment | Vercel                                   |

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Astra DB account (free tier available at [astra.datastax.com](https://astra.datastax.com))
- Groq API key ([console.groq.com](https://console.groq.com))
- Birdeye API key (optional, for enhanced token data)
- Solana wallet (Phantom, Solflare, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agentic-trader.git
cd agentic-trader

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys
# See Environment Variables section below

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Astra DB (DataStax)
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
ASTRA_DB_API_ENDPOINT=https://<db-id>-<region>.apps.astra.datastax.com
ASTRA_DB_NAMESPACE=trading_agent

# Groq AI
GROQ_API_KEY=gsk_...

# Data APIs
DEXSCREENER_API_KEY=        # optional - public endpoints exist
BIRDEYE_API_KEY=            # recommended for token stats
HELIUS_API_KEY=             # Solana RPC + webhooks

# Clerk Auth (optional - can use Solana wallet only)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-in
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Autonomous Agent Defaults
AUTO_TRADING_ENABLED=false
SCAN_INTERVAL_MS=60000
MIN_CONFIDENCE_SCORE=75
MAX_TRADE_AMOUNT_USD=100
SLIPPAGE_BPS=50
MAX_CONCURRENT_TRADES=3
MIN_LIQUIDITY_USD=10000
MIN_VOLUME_24H_USD=5000
```

## Usage

### 1. Connect Wallet

Click "Connect Wallet" in the top right and connect your Solana wallet (Phantom, Solflare, etc.).

### 2. Configure Settings

Click the Settings icon in the topbar to configure:

**General Settings:**

- Enable/disable autonomous trading
- Risk level preset (Conservative, Moderate, Aggressive)
- Scan interval (10-300 seconds)
- Notification preferences

**Trading Settings:**

- Max trade amount ($10-$1000)
- Max concurrent trades (1-10)
- Max daily trades (5-100)
- Minimum confidence score (50-95%)
- Slippage tolerance (0.1-5%)

**Risk Management:**

- Stop loss percentage (5-30%)
- Take profit levels (TP1: 10-200%, TP2: 20-500%)
- Trailing stop percentage (5-30%)
- Position size (% of portfolio)

**Market Filters:**

- Minimum liquidity ($1k-$500k)
- Minimum 24h volume ($1k-$1M)
- Token whitelist/blacklist

### 3. Start Autonomous Trading

**Via UI:**

1. Open the floating agent widget (bottom-right corner)
2. Click the Play button to start autonomous mode
3. Monitor trades in real-time on the dashboard

**Via API:**

```bash
# Start autonomous trading
curl -X POST http://localhost:3000/api/autonomous

# Stop autonomous trading
curl -X DELETE http://localhost:3000/api/autonomous

# Get status
curl http://localhost:3000/api/autonomous
```

### 4. Chat with the Agent

Use the floating agent widget to ask questions:

- "Scan the market for trending tokens"
- "Analyze BONK token for entry opportunities"
- "Find the top performing traders on SOL"
- "Execute a swap for 10 SOL to WIF"

## Project Structure

```
agentic-trader/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/              # Dashboard pages
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── agent/page.tsx        # Agent chat interface
│   │   └── settings/             # Settings (now dialog)
│   ├── api/                      # API routes
│   │   ├── agent/                # Agent chat endpoint
│   │   ├── autonomous/           # Autonomous trading control
│   │   ├── settings/             # User settings
│   │   ├── rag/                  # RAG memory operations
│   │   └── data/                 # Market data endpoints
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── dashboard/                # Dashboard components
│   ├── agent/                    # Agent UI components
│   └── layout/                   # Layout components (topbar, etc.)
│
├── lib/
│   ├── astra/                    # Astra DB client & queries
│   ├── agent/                    # Agent logic & tools
│   │   ├── autonomous-service.ts # Autonomous trading loop
│   │   ├── tools.ts              # AI tool definitions
│   │   └── scoring.ts            # Signal scoring logic
│   ├── data/                     # External API wrappers
│   │   ├── dexscreener.ts        # DexScreener API
│   │   ├── birdeye.ts            # Birdeye API
│   │   └── jupiter.ts            # Jupiter swap API
│   └── solana/                   # Solana helpers
│
├── hooks/                        # React hooks
├── types/                        # TypeScript types
└── CLAUDE.md                     # Development guide
```

## API Reference

### Autonomous Trading

```bash
GET /api/autonomous
# Returns agent status, performance stats, and settings

POST /api/autonomous
# Starts autonomous trading with current user's wallet

DELETE /api/autonomous
# Stops autonomous trading
```

### Settings

```bash
GET /api/settings
# Get user's agent settings

PUT /api/settings
# Update user's settings
Body: { autoTradingEnabled: true, maxTradeAmountUsd: 100, ... }

POST /api/settings/preset
# Apply risk preset
Body: { preset: "conservative" | "moderate" | "aggressive" }
```

### Agent Chat

```bash
POST /api/agent
# Stream chat messages with the AI agent
Body: { messages: [{ role: "user", content: "Scan market" }] }
```

### Market Data

```bash
GET /api/data/trending
# Get trending tokens from DexScreener

GET /api/data/token-list
# Get list of tradable tokens

GET /api/data/ohlcv?token=<address>&timeframe=1h
# Get OHLCV candle data
```

## Confidence Score Calculation

Scores are calculated using weighted factors:

| Factor           | Weight | Description                   |
| ---------------- | ------ | ----------------------------- |
| Liquidity        | 25%    | Higher liquidity = lower risk |
| Volume           | 20%    | Volume/market cap ratio       |
| Price Momentum   | 20%    | 24h price change direction    |
| Smart Money      | 15%    | Top trader behavior           |
| Tokenomics       | 10%    | Security checks               |
| Social Sentiment | 10%    | Social activity               |

### Score Interpretation

- **85-100**: STRONG_BUY
- **75-84**: BUY
- **60-74**: WATCH
- **<60**: AVOID

## Safety Features

1. **Disabled by Default**: `AUTO_TRADING_ENABLED=false` initially
2. **Trade Limits**: Max $100/trade (configurable)
3. **Concurrent Limit**: Max 3 open positions
4. **Confidence Threshold**: Min 75 score required
5. **Liquidity Filter**: Min $10k liquidity
6. **Logging**: All trades logged to database

## Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Type check
npm run type-check

# Install shadcn component
npx shadcn@latest add <component>
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Make sure to add all environment variables in Vercel's dashboard.

### Docker

```bash
# Build image
docker build -t agentic-trader .

# Run container
docker run -p 3000:3000 --env-file .env.local agentic-trader
```

## Troubleshooting

### Agent not starting

1. Check `AUTO_TRADING_ENABLED=true` in `.env.local`
2. Verify wallet is connected
3. Check server logs for errors

### No trades executing

1. Verify confidence threshold (`MIN_CONFIDENCE_SCORE`)
2. Check liquidity/volume filters
3. Ensure `MAX_CONCURRENT_TRADES` not reached

### Database errors

1. Verify Astra DB credentials in `.env.local`
2. Check namespace is `trading_agent`
3. Ensure collections are initialized (auto-created on first use)

### API rate limits

1. Add Birdeye API key for higher limits
2. Increase scan interval in settings
3. Cache responses where possible

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This software is for educational purposes only. Cryptocurrency trading involves substantial risk of loss and is not suitable for every investor. The use of autonomous trading agents does not guarantee profits. Always do your own research and trade responsibly.

**By using this software, you acknowledge that:**

- You are solely responsible for your trading decisions
- Past performance does not indicate future results
- You should only trade with funds you can afford to lose
- This software is provided "as is" without warranty

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/agentic-trader/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/agentic-trader/discussions)
- **Documentation**: See `CLAUDE.md` for development guide

## Acknowledgments

- [Groq](https://groq.com) for fast AI inference
- [DataStax Astra DB](https://datastax.com) for vector database
- [DexScreener](https://dexscreener.com) for market data
- [Birdeye](https://birdeye.so) for token analytics
- [Jupiter](https://jup.ag) for Solana DEX aggregation
- [shadcn/ui](https://ui.shadcn.com) for UI components

---

Built with ❤️ by the Cyber Vision team

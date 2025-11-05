# Backend Task — API Tester

A small Express + TypeScript project that exposes two API endpoints and serves a server-side rendered testing UI at `/` (EJS). Use the UI to test endpoints or call the endpoints directly (curl/Postman).

## Features

- POST `/api/token/:id/insight` — fetches token metadata from CoinGecko and generates an AI insight (via Google Generative AI) when API key is provided.
- GET `/api/hyperliquid/:wallet/pnl` — returns per-day PnL and a summary for a wallet between a start and end date.
- SSR frontend available at `/` to interactively test the endpoints and view JSON responses.
- Request logging middleware (logs method, URL, params, query, body, masked headers, response status and duration).

---

## Requirements

- Node.js 18+ (or compatible)
- npm

Optional services / API keys for full functionality:
- `GEMINI_API_KEY` — Google Gemini API key (used by `generateAIResponse`)
- `GEMINI_MODEL` — optional model name (defaults to `gemini-2.5-flash`)
- `COINGECKO_DEMO_API_KEY` — optional CoinGecko demo API key


## Install

From project root:

```bash
npm install
```

## Scripts

- `npm run dev` — start dev server with `ts-node-dev` (live reload)
- `npm run build` — compile TypeScript into `dist/`
- `npm start` — start `node dist/index.js` (use after `npm run build`)

## Environment

Create a `.env` file in the project root or set env vars in your environment. Typical variables:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
COINGECKO_DEMO_API_KEY=optional_key
```

If `GEMINI_API_KEY` is not provided, the AI service returns a lightweight default insight instead of calling the external API.

---

## How to run

Start in development mode:

```bash
npm run dev
```

Open the SSR frontend in your browser:

```
http://localhost:3000/
```

The UI lets you select an API, provide parameters, and view JSON responses.

---

## API Endpoints

### POST /api/token/:id/insight

Description: Fetch token metadata and market chart data (CoinGecko), ask the AI model to generate a short insight.

Path params:
- `:id` — token id (e.g. `bitcoin`, `chainlink`)

Request body (JSON, optional):
- `vs_currency` (string) — currency for market data (default `usd`)
- `history_days` (number) — how many days of history to include (default `30`)

Sample curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/token/chainlink/insight \
  -d '{"vs_currency":"usd","history_days":30}'
```

Sample response (200):

```json
{
  "source": "coingecko",
  "token": {
    "id": "chainlink",
    "symbol": "link",
    "name": "Chainlink",
    "market_data": {
      "current_price_usd": 7.42,
      "market_cap_usd": 3500000000,
      "total_volume_usd": 45000000,
      "price_change_percentage_24h": -1.23
    }
  },
  "insight": {
    "reasoning": "Over the last 30 days Chainlink has been consolidating after a sharp move higher. Volume shows moderate interest but momentum is mixed, suggesting short-term range-bound behavior.",
    "sentiment": "Neutral"
  },
  "model": {
    "provider": "google",
    "model": "gemini-2.5-flash-flash"
  }
}
```

If CoinGecko or the AI call fails, appropriate 4xx/5xx responses are returned with `error` and `details` fields.

---

### GET /api/hyperliquid/:wallet/pnl?start=YYYY-MM-DD&end=YYYY-MM-DD

Description: Returns daily PnL items and a summary for the wallet between `start` and `end` dates.

Path params:
- `:wallet` — wallet address (expected 0x-prefixed hex; validated by server)

Query params (required):
- `start` — date string `YYYY-MM-DD`
- `end` — date string `YYYY-MM-DD`

Important: The server expects `start` and `end` in `YYYY-MM-DD` format. The UI uses date inputs and will send the correct format.

Sample curl:

```bash
curl "http://localhost:3000/api/hyperliquid/0xabcdef0123456789abcdef0123456789abcdef01/pnl?start=2025-10-20&end=2025-10-24"
```

Sample response (200):

```json
{
  "wallet": "0xabcdef0123456789abcdef0123456789abcdef01",
  "start": "2025-10-20",
  "end": "2025-10-24",
  "daily": [
    {
      "date": "2025-10-20",
      "realized_pnl_usd": 12.5,
      "unrealized_pnl_usd": 0,
      "fees_usd": 0.5,
      "funding_usd": 0.0,
      "net_pnl_usd": 12.0,
      "equity_usd": 1200.0
    },
    {
      "date": "2025-10-21",
      "realized_pnl_usd": -5.0,
      "unrealized_pnl_usd": 2.0,
      "fees_usd": 0.2,
      "funding_usd": -0.1,
      "net_pnl_usd": -3.3,
      "equity_usd": 1198.7
    }
  ],
  "summary": {
    "total_realized_usd": 7.5,
    "total_unrealized_usd": 2.0,
    "total_fees_usd": 0.7,
    "total_funding_usd": -0.1,
    "net_pnl_usd": 8.7
  },
  "diagnostics": {
    "data_source": "hyperliquid_api",
    "last_api_call": "2025-11-05T12:00:00.000Z",
    "notes": "PnL calculated using daily close prices"
  }
}
```

Validation errors (400) example:

```json
{
  "error": "Validation error",
  "message": "Start and end dates are required"
}
```

Or if address validation fails:

```json
{
  "error": "Validation error",
  "message": "Invalid address format"
}
```

---

## Frontend (SSR) — API Tester

Open `http://localhost:3000/` after starting the server. The UI is server-rendered via `views/index.ejs` and static assets come from `public/`.

- Select `Hyperliquid PNL` or `Token Insight` on the left.
- Fill required inputs and press `Send Request`.
- JSON response is shown in the right-hand pane.

The Hyperliquid PNL form uses date pickers and sends `start`/`end` as `YYYY-MM-DD`.

---

## Logging

The application has a request logging middleware that logs each incoming request with masked `Authorization` header and prints the response status and latency. Logs are printed to the server console (stdout).

---

## External API calls made by this project (mapping to code)

This section explains which external APIs the server calls, why, and where that logic lives in the codebase. It helps when you need to add mocks, replace providers, or troubleshoot failures.

- Token Insight flow (POST /api/token/:id/insight)
  - What it does: Fetch token metadata and market price history, then generate a short AI-powered insight.
  - External API calls:
    - CoinGecko (https://api.coingecko.com):
      - endpoints used: `coins/{id}` (token metadata) and `coins/{id}/market_chart` (price history)
      - code locations: `src/controllers/getTokenInsights.ts` (controller) and helper calls inside `src/services/*` as implemented.
      - purpose: get current price, market cap, total volume and recent price series used to build the AI prompt and the `token.market_data` response.
    - Google Generative AI (Gemini) via `@google/generative-ai`:
      - endpoint used: Generative Models `generateContent` (model configurable via `GEMINI_MODEL` env var)
      - code location: `src/services/aiService.ts` (function `generateAIResponse`)
      - purpose: produce a small JSON insight (reasoning + sentiment) from the market facts. If `GEMINI_API_KEY` is not provided or the call fails, the service returns a safe default insight.

- HyperLiquid PNL flow (GET /api/hyperliquid/:wallet/pnl)
  - What it does: Collect fills, funding events and clearinghouse state for the wallet between start/end dates and compute per-day PnL and a summary.
  - External API calls (to `https://api.hyperliquid.xyz/info`):
    - `type: 'userFillsByTime'` — fetch fills in the date range (code: `getUserFills`)
    - `type: 'userFunding'` — fetch funding events in the date range (code: `getUserFunding`)
    - `type: 'clearinghouseState'` — fetch current positions/unrealized PnL (code: `getClearinghouseState`)
    - Code location: `src/services/hyperliquidService.ts` (functions above) and aggregation logic in `calculateDailyPnL`.
    - purpose: fills and funding are aggregated per-day to build `daily` entries; clearinghouse state populates unrealized PnL for the last day; `summary` is the aggregated totals.

- In-memory / internal behavior and post-processing
  - `src/controllers/getHyperLiquidPNL.ts` (controller) calls `calculateDailyPnL` and then prunes the response to remove unhelpful values (zeros/nulls) before returning JSON to clients. The pruning logic lives in `src/utils/pruneZeros.ts`.
  - Why pruning: some upstream fields may contain non-numeric text or NaN which serializes to `null` in JSON — pruning removes these zero-like or absent values for a cleaner response.

Error handling and fallbacks
- External API failures are handled and surfaced as appropriate HTTP error codes:
  - CoinGecko / HyperLiquid issues typically lead to 502/503 with contextual `error` and `details` fields.
  - The AI service (`GEMINI_API_KEY`) is optional: when missing or when the AI call fails the code returns a deterministic fallback insight so the endpoint still responds.

Environment variables relevant to external calls
- `GEMINI_API_KEY` — required to call Google Generative AI (Gemini). If absent, the AI service returns a default insight.
- `GEMINI_MODEL` — optional model name (default: `gemini-2.5-flash`).
- `COINGECKO_DEMO_API_KEY` — optional, if you integrate a paid/demo CoinGecko key.

If you'd like, I can also add a short sequence diagram or an integration test that fully mocks these external endpoints (using `nock`) so CI runs are deterministic.

---

## Troubleshooting

- If the UI doesn't load, ensure server compiled or `npm run dev` is running.
- If AI insights appear as a default fallback, ensure `GEMINI_API_KEY` is set.
- If CoinGecko returns rate-limited responses, consider adding a valid `COINGECKO_DEMO_API_KEY` or respecting rate limits.

---

If you want, I can now start the server and verify the UI and endpoints end-to-end and paste the console output here. Just tell me to proceed.

---

## Docker

This project includes a Dockerfile and a docker-compose file for easy containerized runs.

Build the production image:

```bash
docker build -t backend-task:latest .
```

Run the image:

```bash
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  backend-task:latest
```

Or use docker-compose for convenience:

```bash
docker-compose up --build
```

Notes:
- The Docker image compiles TypeScript during build (multi-stage) and runs the compiled `dist/index.js`.
- The `.env` file is excluded from the image; pass secrets via environment variables when running the container.


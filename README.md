# Trading Dashboard

<br>

> Real-time liquidations, whale trades, treemaps, kimchi premium, fear and greed, paper trading, and live chat in one dashboard for crypto traders.

<br>

## Dashboard

<img width="1432" height="686" alt="Dashboard screenshot" src="https://github.com/user-attachments/assets/7954aa1d-5710-4d74-bb29-04c9ebc837d5" />

| Area | Description | Data source | Refresh |
|------|------|-------------|-----------|
| Real-time liquidations | Binance futures liquidation feed filtered above $5,000 | Binance `!forceOrder@arr` | WebSocket |
| Whale trades | Detects BTC, ETH, SOL, BNB, and XRP trades above $50K | Binance `aggTrade` | WebSocket |
| Prices | Live price, change, and 24h volume by symbol | Binance `@ticker` | WebSocket + batched REST |
| Candle chart | 1m-1d candles with infinite historical scroll | Binance `@kline_{interval}` | WebSocket + REST |
| Kimchi premium | Upbit-Binance spread using mid-price priority | Internal API (`/api/kimchi`) | 5s polling |
| Fear and greed index | Alternative.me Fear & Greed Index | Internal API (`/api/fear-greed`) | One-shot on mount |
| Long/short ratio | Top trader position ratio from 5m to 1d | Binance Futures API | 60s polling |
| Hot coins | Top 15 by volume x volatility score rotation | Binance 24hr ticker | 30s polling, 2s rotation |
| Market indices | S&P 500, gold, KOSPI, and more | Internal API (`/api/market-indices`) | 30s polling |
| Live chat | Real-time messages plus long/short voting | Supabase Realtime | `postgres_changes` subscription |
| News | Latest 30 crypto news items | Supabase | One-shot on mount |
| Online users | Device-based live visitor count | Supabase Realtime | 15s heartbeat |

- Polling-based components pause automatically when the tab is inactive (`useVisibilityPolling`)
- WebSocket connections reconnect automatically after 3 seconds if disconnected

----

## Futures Paper Trading

<img width="1432" height="686" alt="Paper trading screenshot" src="https://github.com/user-attachments/assets/12955b70-0b18-4a74-aeaf-9c7f869924b3" />

| Item | Description |
|------|------|
| Supported symbols | BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, DOT, MATIC (USDT) |
| Live prices | Binance `@ticker` combined stream |
| Market data | Funding, OI, 24h stats, and long/short ratio with 15s polling |
| Chart | lightweight-charts candlesticks + volume histogram |
| TP/SL | Drag on chart and save to Supabase in real time |
| Position management | Persistent orders and positions backed by Supabase |

---

## Tree Map

<img width="1437" height="684" alt="Treemap screenshot" src="https://github.com/user-attachments/assets/4b82ac3b-05d2-4c58-84ec-1edbccef0a6b" />

- Filters Binance 24hr tickers above $500K quote volume and shows the top 150 coins
- Area uses a `sqrt(volume)` log scale, color uses a red-green 24h change gradient
- Squarified treemap layout with 30s polling

---

## Tech Stack

| Category | Stack |
|-----------|--------|
| **Frontend** | [Next.js (App Router)](https://nextjs.org/), TypeScript, TailwindCSS |
| **State** | Jotai |
| **Realtime** | WebSocket (Binance Stream), Supabase Realtime (`postgres_changes`) |
| **Chart** | lightweight-charts |
| **Backend** | [Supabase](https://supabase.com/) (Postgres · Realtime · Auth · Storage) |
| **Deploy** | [Vercel](https://vercel.com/) |

---

## Desktop App

This project can run as a desktop app through Electron.

Install dependencies:

```bash
npm install
```

Run in desktop development mode:

```bash
npm run desktop:dev
```

Run the desktop app against a production Next.js build:

```bash
npm run build
npm run desktop:start
```

The desktop shell opens the local Next.js app in a native window and sends external links to the system browser.

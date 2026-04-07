# 📈 TradeHub (Trading Dashboard)

TradeHub is a comprehensive, real-time cryptocurrency trading dashboard and simulation platform. It provides traders with actionable insights through live data feeds, sentiment analysis, and a robust paper trading environment.

---

## Dashboard

<img width="2528" height="1347" alt="image" src="https://github.com/user-attachments/assets/349d0e7e-0bc9-4ccf-be21-1c494e17ae09" />

<img width="2528" height="1347" alt="image" src="https://github.com/user-attachments/assets/c3678281-65e0-4b35-9699-c4793ede1977" />

## ✨ Key Features

### 📊 Real-Time Market Data
*   **Liquidation Feed:** Live Binance futures liquidation tracking (filtered >$5,000).
*   **Whale Tracker:** Real-time alerts for large trades (BTC, ETH, SOL, BNB, XRP) exceeding $50K.
*   **Price Monitoring:** Live ticker updates, 24h volume, and percentage changes.
*   **Kimchi Premium:** Real-time spread tracking between Upbit and Binance.
*   **Market Indices:** Global indices (S&P 500, Gold, KOSPI) integrated via internal APIs.

### 🎮 Futures Simulation (Paper Trading)
*   **Realistic Trading:** Execute long/short positions with adjustable leverage and margin modes (Cross/Isolated).
*   **Visual TP/SL:** Interactive Take Profit and Stop Loss management directly on the charts.
*   **Persistent Portfolio:** Trade history and positions are securely stored and synced via Supabase.

### 🔍 Advanced Visualization
*   **Crypto Treemap:** A visual overview of the top 150 coins by volume and performance.
*   **Interactive Charts:** High-performance `lightweight-charts` with technical indicators and volume histograms.
*   **Sentiment Gauge:** Live Fear & Greed Index and Long/Short ratio analysis.

### 🌐 Social & Utility
*   **Community Chat:** Real-time chat with integrated Long/Short sentiment voting.
*   **News Aggregator:** Automated crypto news collection from multiple RSS sources.
*   **Resource Optimized:** Background tasks automatically pause when the tab is inactive to minimize CPU/Network usage.

---

## 🛠 Technical Stack

*   **Framework:** [Next.js 15](https://nextjs.org/) (App Router), React 19, TypeScript
*   **Styling:** Tailwind CSS 4, Framer Motion (Animations)
*   **State:** [Jotai](https://jotai.org/) (Atomic State Management)
*   **Backend:** [Supabase](https://supabase.com/) (Postgres, Realtime, Auth, Storage)
*   **Data:** Binance WebSockets & REST APIs
*   **Desktop:** [Electron](https://www.electronjs.org/)

---

## Tree Map

<img width="1437" height="684" alt="Treemap screenshot" src="https://github.com/user-attachments/assets/4b82ac3b-05d2-4c58-84ec-1edbccef0a6b" />

- Filters Binance 24hr tickers above $500K quote volume and shows the top 150 coins
- Area uses a `sqrt(volume)` log scale, color uses a red-green 24h change gradient
- Squarified treemap layout with 30s polling


## 🚀 Getting Started

### Prerequisites
*   Node.js 20.x or higher
*   Supabase Account & Project

### Installation

1.  **Clone & Install:**
    ```bash
    git clone https://github.com/your-username/TradeHub.git
    cd TradeHub
    npm install
    ```

2.  **Environment Setup:**
    Create a `.env.local` file with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    ```

3.  **Database Migration:**
    Apply the SQL migrations located in `supabase/migrations/` to your Supabase project to initialize the database schema.

### Development

**Web Version:**
```bash
npm run dev
```

**Desktop Version:**
```bash
npm run desktop:dev
```

---

## 📁 Project Structure

*   `src/app/`: Next.js pages and API routes.
*   `src/components/`: Modular UI components (Charts, Widgets, Panels).
*   `src/hooks/`: Custom React hooks for WebSockets and polling logic.
*   `src/lib/`: Core utilities and Supabase client configurations.
*   `desktop/`: Electron main and preload scripts.
*   `supabase/`: Database schema migrations and configuration.

---

## 🛡 License

This project is private and intended for educational/personal use.

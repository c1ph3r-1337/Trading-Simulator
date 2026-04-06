import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
export const preferredRegion = ["hnd1", "sin1"];

// ===== 설정 (현실 보정치) =====
const FX_SPREAD = Number(process.env.FX_SPREAD ?? "0"); // 보정 제거
const USDT_USD  = Number(process.env.USDT_USD  ?? "1.0");

// ===== 외부 응답 타입 =====
type UpbitTicker = Array<{ trade_price: number; timestamp: number }>;
type UpbitOrderbook = Array<{
  orderbook_units: Array<{ ask_price: number; bid_price: number }>;
  timestamp: number;
}>;
type BinanceTicker = { symbol?: string; price?: string };

// ===== API 응답 타입(클라와 공유 가능) =====
export type KimchiResponse = {
  symbol: string;
  upbitKrw: number | null;
  upbitPriceSource?: "orderbook_mid" | "trade_price";
  binanceUsdt: number | null;
  usdkrw: number | null;
  globalKrw: number | null;
  premium: number | null;     // null이면 계산 불가
  updatedAt: string;
  degraded: boolean;          // 부분성공/폴백 여부
  cached?: boolean;           // 최근 스냅샷 사용 여부
  upstream?: {
    fxAdj?: number;
    usdtUsd?: number;
  };
};

// ===== 내부 유틸 =====
function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function withTimeout(url: string, ms = 3500, init?: RequestInit) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(id));
}

// ===== 외부 호출들 (실패 시 null 반환) =====
async function fetchUsdKrw(): Promise<number | null> {
  // 1순위: frankfurter.app (ECB 기반 실시간 환율)
  try {
    const r = await withTimeout("https://api.frankfurter.app/latest?from=USD&to=KRW", 3000, {
      headers: { "User-Agent": "TradingDashboard/1.0" },
      cache: "no-store",
    });
    if (r.ok) {
      const j = await r.json() as { rates?: { KRW?: number } };
      const krw = j?.rates?.KRW;
      if (isNum(krw)) return krw;
    }
  } catch { /* try fallback */ }

  // 2순위: 폴백 API들
  const urls = [
    "https://api.exchangerate-api.com/v4/latest/USD",
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  ];

  for (const url of urls) {
    try {
      const r = await withTimeout(url, 3500, {
        headers: { "User-Agent": "TradingDashboard/1.0" },
        cache: "no-store",
      });
      if (!r.ok) continue;
      const j = await r.json();

      // exchangerate-api.com 형식
      if (j?.rates?.KRW && isNum(j.rates.KRW)) {
        return j.rates.KRW;
      }

      // fawazahmed0 형식
      if (j?.usd?.krw && isNum(j.usd.krw)) {
        return j.usd.krw;
      }
    } catch { /* try next */ }
  }
  return null;
}

async function fetchBinancePrice(symbol: string): Promise<number | null> {
  const hosts = [
    "api.binance.com",
    "api1.binance.com",
    "api2.binance.com",
    "data-api.binance.vision",
  ];
  for (const h of hosts) {
    try {
      const r = await withTimeout(`https://${h}/api/v3/ticker/price?symbol=${symbol}`, 3500, {
        headers: { "User-Agent": "TradingDashboard/1.0" },
        cache: "no-store",
      });
      if (!r.ok) continue;
      const j = (await r.json()) as BinanceTicker;
      const p = Number(j?.price);
      if (isNum(p)) return p;
    } catch { /* try next */ }
  }
  return null;
}

type UpbitPriceResult = { price: number; source: "orderbook_mid" | "trade_price" } | null;

async function fetchUpbitPrice(market: string): Promise<UpbitPriceResult> {
  // 1) 오더북 MID 우선
  try {
    const r = await withTimeout(`https://api.upbit.com/v1/orderbook?markets=${market}`, 1500, {
      headers: { "User-Agent": "TradingDashboard/1.0" },
      cache: "no-store",
    });
    if (r.ok) {
      const j = (await r.json()) as UpbitOrderbook;
      const u0 = j?.[0]?.orderbook_units?.[0];
      if (u0) {
        const mid = (u0.ask_price + u0.bid_price) / 2;
        if (isNum(mid)) return { price: mid, source: "orderbook_mid" };
      }
    }
  } catch { /* fallback */ }

  // 2) 체결가
  try {
    const r2 = await withTimeout(`https://api.upbit.com/v1/ticker?markets=${market}`, 1500, {
      headers: { "User-Agent": "TradingDashboard/1.0" },
      cache: "no-store",
    });
    if (r2.ok) {
      const j2 = (await r2.json()) as UpbitTicker;
      const p = j2?.[0]?.trade_price;
      if (isNum(p)) return { price: p, source: "trade_price" };
    }
  } catch { /* give up */ }

  return null;
}

// ===== 최근 정상 스냅샷(메모리 캐시) =====
let lastGood: KimchiResponse | null = null;
let lastUpdated = 0; // ms
const SNAPSHOT_TTL_MS = 60_000;

// ===== 메인 핸들러 (항상 200) =====
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sym = (url.searchParams.get("symbol") || "BTC").toUpperCase();
  const upbitMarket = `KRW-${sym}`;
  const binanceSymbol = `${sym}USDT`;

  try {
    const [usdkrw, binanceUsdt, upbit] = await Promise.all([
      fetchUsdKrw(),
      fetchBinancePrice(binanceSymbol),
      fetchUpbitPrice(upbitMarket),
    ]);

    // 일부라도 실패했을 때: 최근 스냅샷 있는지 확인
    if (usdkrw === null || binanceUsdt === null || upbit === null) {
      if (lastGood && Date.now() - lastUpdated < SNAPSHOT_TTL_MS) {
        return NextResponse.json({ ...lastGood, degraded: true, cached: true }, {
          headers: { "Cache-Control": "no-store, must-revalidate" },
        });
      }
      // 최근 스냅샷이 없으면 가능한 값만 채워서 premium=null 로
      const partial: KimchiResponse = {
        symbol: sym,
        upbitKrw: upbit?.price ?? null,
        upbitPriceSource: upbit?.source ?? undefined,
        binanceUsdt: binanceUsdt ?? null,
        usdkrw: usdkrw ?? null,
        globalKrw: null,
        premium: null,
        degraded: true,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json(partial, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    }

    // 정상 계산
    const usdkrwEffective = usdkrw * (1 + FX_SPREAD);
    const globalKrw = binanceUsdt * USDT_USD * usdkrwEffective;
    const premium = (upbit.price - globalKrw) / globalKrw;

    const body: KimchiResponse = {
      symbol: sym,
      upbitKrw: upbit.price,
      upbitPriceSource: upbit.source,
      binanceUsdt,
      usdkrw,
      globalKrw,
      premium,
      degraded: false,
      updatedAt: new Date().toISOString(),
      upstream: { fxAdj: 1 + FX_SPREAD, usdtUsd: USDT_USD },
    };

    // 스냅샷 갱신
    lastGood = body;
    lastUpdated = Date.now();

    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  } catch (_e) {
    // 예외여도 200 + 스냅샷/빈값
    if (lastGood) {
      return NextResponse.json({ ...lastGood, degraded: true, cached: true }, {
        headers: { "Cache-Control": "no-store, must-revalidate" },
      });
    }
    const empty: KimchiResponse = {
      symbol: sym,
      upbitKrw: null,
      binanceUsdt: null,
      usdkrw: null,
      globalKrw: null,
      premium: null,
      degraded: true,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(empty, {
      headers: { "Cache-Control": "no-store, must-revalidate" },
    });
  }
}

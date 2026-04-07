import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// 응답 타입
export type MarketIndex = {
    symbol: string;
    name: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    updatedAt: string;
};

export type MarketIndicesResponse = {
    indices: MarketIndex[];
    degraded: boolean;
    updatedAt: string;
};

// Yahoo Finance symbols aligned to the local India-focused market view
const INDICES = [
    { symbol: "^NSEI", name: "NIFTY 50" },
    { symbol: "^BSESN", name: "SENSEX" },
    { symbol: "GC=F", name: "GOLD 10g" },
] as const;

const TROY_OUNCE_TO_GRAMS = 31.1034768;
const TEN_GRAMS_PER_TROY_OUNCE = 10 / TROY_OUNCE_TO_GRAMS;

function withTimeout(url: string, ms = 5000, init?: RequestInit) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...init, signal: ctrl.signal }).finally(() =>
        clearTimeout(id)
    );
}

type YahooChartResponse = {
    chart?: {
        result?: Array<{
            meta?: {
                regularMarketPrice?: number;
                previousClose?: number;
                chartPreviousClose?: number;
                symbol?: string;
            };
        }>;
    };
};

async function fetchYahooQuote(symbol: string): Promise<{
    price: number | null;
    change: number | null;
    changePercent: number | null;
}> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        const res = await withTimeout(url, 5000, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            return { price: null, change: null, changePercent: null };
        }

        const data = (await res.json()) as YahooChartResponse;
        const meta = data?.chart?.result?.[0]?.meta;

        if (!meta?.regularMarketPrice) {
            return { price: null, change: null, changePercent: null };
        }

        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
        const change = price - prevClose;
        const changePercent = prevClose ? (change / prevClose) * 100 : 0;

        return {
            price,
            change,
            changePercent,
        };
    } catch {
        return { price: null, change: null, changePercent: null };
    }
}

async function fetchUsdInrRate(): Promise<number | null> {
    try {
        const res = await withTimeout(
            "https://api.frankfurter.dev/v2/rates?base=USD&quotes=INR",
            5000,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                },
                cache: "no-store",
            }
        );

        if (!res.ok) return null;

        const data = (await res.json()) as Array<{ rate?: number }>;
        const rate = data[0]?.rate;
        return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
    } catch {
        return null;
    }
}

// 메모리 캐시
let lastGood: MarketIndicesResponse | null = null;
let lastUpdated = 0;
const CACHE_TTL_MS = 30_000; // 30초

export async function GET() {
    try {
        const now = Date.now();

        // 캐시가 유효하면 반환
        if (lastGood && now - lastUpdated < CACHE_TTL_MS) {
            return NextResponse.json(lastGood, {
                headers: { "Cache-Control": "no-store, must-revalidate" },
            });
        }

        const usdInrRate = await fetchUsdInrRate();

        const results = await Promise.all(
            INDICES.map(async ({ symbol, name }) => {
                const quote = await fetchYahooQuote(symbol);
                const isGold = symbol === "GC=F";
                const fx = isGold ? usdInrRate : null;
                const goldUnitFactor = isGold ? TEN_GRAMS_PER_TROY_OUNCE : 1;
                const price =
                    isGold && quote.price !== null && fx !== null
                        ? quote.price * fx * goldUnitFactor
                        : quote.price;
                const change =
                    isGold && quote.change !== null && fx !== null
                        ? quote.change * fx * goldUnitFactor
                        : quote.change;

                return {
                    symbol,
                    name,
                    price,
                    change,
                    changePercent: quote.changePercent,
                    updatedAt: new Date().toISOString(),
                } satisfies MarketIndex;
            })
        );

        const degraded = results.some((r) => r.price === null);

        const response: MarketIndicesResponse = {
            indices: results,
            degraded,
            updatedAt: new Date().toISOString(),
        };

        // 캐시 업데이트
        if (!degraded) {
            lastGood = response;
            lastUpdated = now;
        }

        return NextResponse.json(response, {
            headers: { "Cache-Control": "no-store, must-revalidate" },
        });
    } catch {
        // 에러 시 캐시 반환
        if (lastGood) {
            return NextResponse.json(
                { ...lastGood, degraded: true },
                {
                    headers: { "Cache-Control": "no-store, must-revalidate" },
                }
            );
        }

        return NextResponse.json(
            {
                indices: INDICES.map(({ symbol, name }) => ({
                    symbol,
                    name,
                    price: null,
                    change: null,
                    changePercent: null,
                    updatedAt: new Date().toISOString(),
                })),
                degraded: true,
                updatedAt: new Date().toISOString(),
            } satisfies MarketIndicesResponse,
            {
                headers: { "Cache-Control": "no-store, must-revalidate" },
            }
        );
    }
}

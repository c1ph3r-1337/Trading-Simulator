import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type FxRateResponse = {
    base: string;
    quote: string;
    rate: number | null;
    date: string | null;
    provider: string;
    degraded: boolean;
};

type FrankfurterRateRow = {
    date: string;
    base: string;
    quote: string;
    rate: number;
};

let lastGood: FxRateResponse | null = null;
let lastUpdatedAt = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function withTimeout(url: string, ms = 5000, init?: RequestInit) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...init, signal: ctrl.signal }).finally(() =>
        clearTimeout(id)
    );
}

export async function GET(req: NextRequest) {
    const base = (req.nextUrl.searchParams.get("base") ?? "USD").toUpperCase();
    const quote = (req.nextUrl.searchParams.get("quote") ?? "INR").toUpperCase();
    const now = Date.now();

    if (
        lastGood &&
        lastGood.base === base &&
        lastGood.quote === quote &&
        now - lastUpdatedAt < CACHE_TTL_MS
    ) {
        return NextResponse.json(lastGood, {
            headers: { "Cache-Control": "no-store, must-revalidate" },
        });
    }

    try {
        const url = `https://api.frankfurter.dev/v2/rates?base=${encodeURIComponent(base)}&quotes=${encodeURIComponent(quote)}`;
        const res = await withTimeout(url, 5000, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as FrankfurterRateRow[];
        const latest = data[0];

        if (!latest || !Number.isFinite(latest.rate)) {
            throw new Error("Invalid FX payload");
        }

        const response: FxRateResponse = {
            base,
            quote,
            rate: latest.rate,
            date: latest.date,
            provider: "Frankfurter",
            degraded: false,
        };

        lastGood = response;
        lastUpdatedAt = now;

        return NextResponse.json(response, {
            headers: { "Cache-Control": "no-store, must-revalidate" },
        });
    } catch {
        if (lastGood && lastGood.base === base && lastGood.quote === quote) {
            return NextResponse.json(
                { ...lastGood, degraded: true },
                {
                    headers: { "Cache-Control": "no-store, must-revalidate" },
                }
            );
        }

        return NextResponse.json(
            {
                base,
                quote,
                rate: null,
                date: null,
                provider: "Frankfurter",
                degraded: true,
            } satisfies FxRateResponse,
            {
                headers: { "Cache-Control": "no-store, must-revalidate" },
            }
        );
    }
}

"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { treemapOpenAtom } from "@/store/atoms";
import type { KimchiResponse } from "@/app/api/kimchi/route";

type Data = KimchiResponse;

async function fetchKimchiOnce(
    symbol: string,
    signal?: AbortSignal
): Promise<Data> {
    const r = await fetch(`/api/kimchi?symbol=${encodeURIComponent(symbol)}`, {
        cache: "no-store",
        signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as Data;
    if (typeof j.symbol !== "string")
        throw new Error("Invalid payload: symbol");
    return j;
}

async function fetchKimchiWithRetry(
    symbol: string,
    signal?: AbortSignal
): Promise<Data> {
    const delays = [300, 800];
    let attempt = 0;
    while (attempt <= delays.length) {
        try {
            return await fetchKimchiOnce(symbol, signal);
        } catch (e) {
            if (signal?.aborted) throw e;
            if (attempt === delays.length) break;
            await new Promise((res) => setTimeout(res, delays[attempt]));
            attempt++;
        }
    }
    throw new Error("fetch failed");
}

export default function KimchiWidget({
    symbol = "BTC",
    pollMs = 5000,
    fadeDelay = 0,
    className = "",
}: {
    symbol?: string;
    pollMs?: number;
    fadeDelay?: number;
    className?: string;
}) {
    const [data, setData] = useState<Data | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    const load = useCallback(async () => {
        try {
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            const d = await fetchKimchiWithRetry(symbol, ctrl.signal);
            if (ctrl.signal.aborted) return;
            setData(d);
        } catch {
            // 에러 시 기존 데이터 유지
        }
    }, [symbol]);

    // 탭 비활성화 또는 트리맵 열림 시 폴링 중단
    useVisibilityPolling({
        interval: pollMs,
        onPoll: load,
        immediate: true,
        enabled: !isTreemapOpen,
    });

    const pct = data?.premium != null ? data.premium * 100 : null;
    const color =
        pct == null
            ? "text-zinc-400"
            : pct >= 0
            ? "text-emerald-500"
            : "text-rose-500";

    const isLoading = data == null;

    return (
        <div
            className={`relative rounded-2xl border border-neutral-800 bg-neutral-900 p-5 2xl:p-6 text-white ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`transition-[opacity,transform] duration-700 ${isLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm 2xl:text-base font-semibold">Kimchi Premium</h3>
                    <span className="text-xs 2xl:text-sm text-zinc-400">
                        {data?.symbol ?? symbol}
                    </span>
                </div>

                <div className={`mt-3 text-2xl 2xl:text-3xl font-bold ${color}`}>
                    {pct != null ? `${pct.toFixed(2)}%` : "—"}
                </div>

                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 2xl:gap-x-4 2xl:gap-y-2 text-xs 2xl:text-sm text-zinc-400">
                    <dt className="whitespace-nowrap">Upbit (KRW)</dt>
                    <dd className="text-right text-emerald-300 font-mono tabular-nums whitespace-nowrap">
                        {data ? `${(data.upbitKrw ?? 0).toLocaleString()} KRW` : "—"}
                    </dd>

                    <dt className="whitespace-nowrap">Binance (USDT)</dt>
                    <dd className="text-right text-amber-300 font-mono tabular-nums whitespace-nowrap">
                        {data ? `${(data.binanceUsdt ?? 0).toLocaleString()} USDT` : "—"}
                    </dd>

                    <dt className="whitespace-nowrap">USD/KRW</dt>
                    <dd className="text-right text-zinc-200 font-mono tabular-nums whitespace-nowrap">
                        {data ? `${Math.round(data.usdkrw ?? 0).toLocaleString()} KRW` : "—"}
                    </dd>
                </dl>
            </div>

            {/* 툴팁 */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-[235px] text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-lg py-4 px-5 shadow-lg z-50 pointer-events-none"
                    >
                        <div className="font-semibold text-amber-300 mb-1">
                            About this metric
                        </div>
                        <p className="leading-snug">
                            This premium compares the Upbit KRW price,
                            <br /> the Binance USD price, and the
                            <br /> USD/KRW exchange rate.
                            <br />
                            <br />• Positive: Korea is trading
                            <b> above offshore markets</b>
                            <br />• Negative: offshore markets are higher
                            <br />
                            <br />
                            It updates in real time and reflects
                            <b> exchange-rate moves</b> and
                            <br />
                            exchange price differences together.
                        </p>
                        {/* 삼각형 화살표 */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

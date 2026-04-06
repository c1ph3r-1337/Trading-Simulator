"use client";

import { useCallback, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { treemapOpenAtom } from "@/store/atoms";
import type { MarketIndicesResponse, MarketIndex } from "@/app/api/market-indices/route";

async function fetchIndices(signal?: AbortSignal): Promise<MarketIndicesResponse> {
    const res = await fetch("/api/market-indices", {
        cache: "no-store",
        signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<MarketIndicesResponse>;
}

function formatCompact(price: number, symbol: string): string {
    if (symbol === "GC=F") return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (symbol === "^KS11") return price.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexItem({ index }: { index: MarketIndex }) {
    const isPositive = (index.changePercent ?? 0) >= 0;
    const color = index.changePercent === null
        ? "text-neutral-400"
        : isPositive
        ? "text-emerald-400"
        : "text-red-400";

    return (
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center py-2 2xl:py-3 px-3 2xl:px-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl hover:bg-neutral-800/70 transition-colors">
            <span className="text-[10px] 2xl:text-xs text-neutral-300 font-medium mb-1">
                {index.name}
            </span>
            <span className="text-sm 2xl:text-base text-white font-mono font-semibold">
                {index.price !== null ? formatCompact(index.price, index.symbol) : "—"}
            </span>
            <span className={`text-[11px] 2xl:text-xs font-mono font-medium mt-0.5 ${color}`}>
                {index.changePercent !== null ? (
                    `${isPositive ? "+" : ""}${index.changePercent.toFixed(2)}%`
                ) : "—"}
            </span>
        </div>
    );
}

export default function MarketIndicesWidget({ pollMs = 30000, fadeDelay = 0 }: { pollMs?: number; fadeDelay?: number }) {
    const [data, setData] = useState<MarketIndicesResponse | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    const load = useCallback(async () => {
        try {
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;

            const result = await fetchIndices(ctrl.signal);
            if (ctrl.signal.aborted) return;

            setData(result);
        } catch {
            // 에러 시 기존 데이터 유지
        }
    }, []);

    // 탭 비활성화 또는 트리맵 열림 시 폴링 중단
    useVisibilityPolling({
        interval: pollMs,
        onPoll: load,
        immediate: true,
        enabled: !isTreemapOpen,
    });

    return (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 2xl:p-4">
            <div className={`flex gap-3 transition-[opacity,transform] duration-700 ${data ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                {data ? (
                    data.indices.map((idx) => (
                        <IndexItem key={idx.symbol} index={idx} />
                    ))
                ) : (
                    [1, 2, 3].map((i) => (
                        <div key={i} className="h-14 2xl:h-16 flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-xl animate-pulse" />
                    ))
                )}
            </div>
        </div>
    );
}

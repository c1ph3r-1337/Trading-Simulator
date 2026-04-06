"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAtomValue } from "jotai";
import { treemapOpenAtom } from "@/store/atoms";

type Ticker24h = {
    symbol: string;
    priceChangePercent: string;
    quoteVolume: string;
    lastPrice: string;
};

const EXCLUDE_PATTERNS = /(UP|DOWN|BULL|BEAR|1000)/;

function isHotCandidate(sym: string) {
    return (
        sym.endsWith("USDT") &&
        !EXCLUDE_PATTERNS.test(sym) &&
        sym !== "USDCUSDT" &&
        sym !== "FDUSDUSDT"
    );
}

function scoreOf(t: Ticker24h) {
    const vol = Number(t.quoteVolume) || 0;
    const pct = Math.abs(Number(t.priceChangePercent) || 0) / 100;

    // 거래량 최소 필터 (300만 달러 미만 제외)
    if (vol < 3000000) return 0;

    // √거래량 × 등락률² (거래량 있으면서 변동성 큰 코인 우선)
    return Math.sqrt(vol) * Math.pow(pct, 2) * 1000000;
}

export default function HotSymbolsTicker({ fadeDelay = 0 }: { fadeDelay?: number } = {}) {
    const [list, setList] = useState<Ticker24h[]>([]);
    const [idx, setIdx] = useState(0);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showListTooltip, setShowListTooltip] = useState(false);
    const timerRef = useRef<number | null>(null);
    const listTooltipRef = useRef<HTMLDivElement>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    // 바깥 클릭 시 툴팁 닫기
    useEffect(() => {
        if (!showListTooltip) return;
        const handleClick = (e: MouseEvent) => {
            if (listTooltipRef.current && !listTooltipRef.current.contains(e.target as Node)) {
                setShowListTooltip(false);
            }
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [showListTooltip]);

    // 30초마다 전체 리스트 갱신 (트리맵 열려있으면 중단)
    useEffect(() => {
        if (isTreemapOpen) return;

        let aborted = false;
        const load = async () => {
            try {
                const res = await fetch(
                    "https://api.binance.com/api/v3/ticker/24hr",
                    {
                        cache: "no-store",
                    }
                );
                if (!res.ok) return;
                const all = (await res.json()) as Ticker24h[];

                const filtered = all
                    .filter((t) => isHotCandidate(t.symbol))
                    .sort((a, b) => scoreOf(b) - scoreOf(a))
                    .slice(0, 30);

                if (!aborted) setList(filtered);
            } catch {}
        };

        load();
        const intv = window.setInterval(load, 30_000);
        return () => {
            aborted = true;
            clearInterval(intv);
        };
    }, [isTreemapOpen]);

    // 2초마다 다음 항목으로 (Top 15만 회전, 트리맵 열려있으면 중단)
    useEffect(() => {
        if (isTreemapOpen) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            timerRef.current = null;
            return;
        }

        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setIdx((i) =>
                list.length ? (i + 1) % Math.min(list.length, 15) : 0
            );
        }, 2000);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
        };
    }, [list, isTreemapOpen]);

    const current = list.length ? list[idx] : null;

    return (
        <div className={`relative flex items-center gap-3 2xl:gap-4 text-sm 2xl:text-base ml-10 text-neutral-200 transition-[opacity,transform] duration-700 ${current ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <p className="hotcoin-badge text-[12px] 2xl:text-sm px-3 2xl:px-4 py-2 2xl:py-2.5 min-h-[36px] 2xl:min-h-[44px] flex items-center rounded-full select-none cursor-pointer shadow-sm transition-colors">
                    <span className="whitespace-nowrap">🔥 Hot Coin</span>
                </p>

                <AnimatePresence>
                    {showTooltip && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-[210px] 2xl:w-[260px] text-[11px] 2xl:text-xs bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-lg px-4 2xl:px-5 py-3 2xl:py-4 shadow-xl z-[100]"
                        >
                            <div className="font-semibold text-amber-300 mb-1 2xl:mb-2">
                                Scoring
                            </div>
                            <ul className="space-y-[2px] leading-tight">
                                <li>24h quote volume (USDT) plus a price-change bonus</li>
                            </ul>
                            {/* 테두리가 있는 삼각형 화살표 */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 실시간 회전 코인 */}
            <div
                ref={listTooltipRef}
                className="relative w-[300px] 2xl:w-[380px] cursor-pointer"
                onClick={() => setShowListTooltip(!showListTooltip)}
            >
                <div className="overflow-hidden">
                <div>
                <AnimatePresence mode="popLayout">
                    {current && (
                        <motion.div
                            key={current.symbol + idx}
                            initial={{ y: 16, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -16, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="whitespace-nowrap"
                            title={`${current.symbol} · ${Number(
                                current.priceChangePercent
                            ).toFixed(2)}% · $${Number(
                                current.lastPrice
                            ).toLocaleString()}`}
                        >
                            <b className="text-emerald-400 mr-1">
                                Top {idx + 1}
                            </b>
                            <span className="font-mono">
                                {prettySym(current.symbol)}
                            </span>
                            <span className="mx-2 text-neutral-500">·</span>
                            <span
                                className={
                                    Number(current.priceChangePercent) >= 0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                }
                            >
                                {Number(current.priceChangePercent) >= 0
                                    ? "▲"
                                    : "▼"}{" "}
                                {Number(current.priceChangePercent).toFixed(2)}%
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
                </div>
                </div>

                {/* Top 15 전체 리스트 툴팁 */}
                <AnimatePresence>
                    {showListTooltip && list.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-[280px] 2xl:w-[340px] text-[11px] 2xl:text-xs bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-lg py-4 2xl:py-5 px-5 2xl:px-6 shadow-xl z-[100] pointer-events-none"
                        >
                            <div className="font-semibold text-amber-300 mb-2 2xl:mb-3 2xl:text-sm">
                                🔥 Hot Coin Top 15
                            </div>
                            <div className="space-y-0.5 2xl:space-y-1 pb-1">
                                {list.slice(0, 15).map((item, i) => (
                                    <div
                                        key={item.symbol}
                                        className={`flex items-center justify-between py-1 2xl:py-1.5 ${
                                            i === idx ? 'text-amber-300 font-semibold' : ''
                                        }`}
                                    >
                                        <span className="text-[10px] 2xl:text-[11px] text-neutral-500 mr-2 w-[14px] text-right">
                                            {i + 1}
                                        </span>
                                        <span className="flex-1 font-mono">
                                            {prettySym(item.symbol)}
                                        </span>
                                        <span
                                            className={
                                                Number(item.priceChangePercent) >= 0
                                                    ? "text-emerald-400"
                                                    : "text-red-400"
                                            }
                                        >
                                            {Number(item.priceChangePercent) >= 0 ? "▲" : "▼"}{" "}
                                            {Number(item.priceChangePercent).toFixed(2)}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {/* 테두리가 있는 삼각형 화살표 */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

function prettySym(sym: string) {
    return sym.replace(/USDT$/, "") + "/USDT";
}

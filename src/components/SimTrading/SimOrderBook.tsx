"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { simSymbolAtom, simPricesAtom, activePageAtom } from "@/store/atoms";

function useTheme() {
    const [isLight, setIsLight] = useState(false);
    useEffect(() => {
        const html = document.documentElement;
        setIsLight(html.classList.contains("light"));
        const observer = new MutationObserver(() => {
            setIsLight(html.classList.contains("light"));
        });
        observer.observe(html, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);
    return isLight;
}

type OrderBookEntry = [string, string]; // [price, quantity]

interface DepthSnapshot {
    b: OrderBookEntry[];
    a: OrderBookEntry[];
}

const ROWS = 14;

interface Props {
    onPriceClick?: (price: number) => void;
}

export default function SimOrderBook({ onPriceClick }: Props) {
    const simSymbol = useAtomValue(simSymbolAtom);
    const activePage = useAtomValue(activePageAtom);
    const prices = useAtomValue(simPricesAtom);
    const isLight = useTheme();
    const currentPrice = prices[simSymbol] ?? 0;
    const prevPriceRef = useRef(0);
    const [priceUp, setPriceUp] = useState(true);

    const [bids, setBids] = useState<OrderBookEntry[]>([]);
    const [asks, setAsks] = useState<OrderBookEntry[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<number | null>(null);

    useEffect(() => {
        if (currentPrice > 0 && prevPriceRef.current > 0) {
            if (currentPrice !== prevPriceRef.current) {
                setPriceUp(currentPrice > prevPriceRef.current);
            }
        }
        prevPriceRef.current = currentPrice;
    }, [currentPrice]);

    useEffect(() => {
        if (activePage !== "sim") return;

        function connect() {
            const stream = `${simSymbol.toLowerCase()}@depth20@100ms`;
            const ws = new WebSocket(`wss://fstream.binance.com/ws/${stream}`);

            ws.onmessage = (ev: MessageEvent<string>) => {
                try {
                    const data = JSON.parse(ev.data) as DepthSnapshot;
                    if (data.b) setBids(data.b.slice(0, ROWS));
                    if (data.a) setAsks(data.a.slice(0, ROWS));
                } catch {}
            };

            ws.onclose = () => {
                if (activePage === "sim") {
                    reconnectRef.current = window.setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                try { ws.close(); } catch {}
            };

            wsRef.current = ws;
        }

        connect();

        return () => {
            if (reconnectRef.current) {
                clearTimeout(reconnectRef.current);
                reconnectRef.current = null;
            }
            if (wsRef.current) {
                wsRef.current.onmessage = null;
                wsRef.current.onclose = null;
                wsRef.current.onerror = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [simSymbol, activePage]);

    const coinName = simSymbol.replace("USDT", "");

    const sortedAsks = useMemo(
        () => [...asks].sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])),
        [asks]
    );

    const asksCum = useMemo(() => {
        const result: number[] = new Array(sortedAsks.length);
        let cum = 0;
        for (let i = sortedAsks.length - 1; i >= 0; i--) {
            cum += parseFloat(sortedAsks[i][1]);
            result[i] = cum;
        }
        return result;
    }, [sortedAsks]);

    const bidsCum = useMemo(() => {
        const result: number[] = new Array(bids.length);
        let cum = 0;
        for (let i = 0; i < bids.length; i++) {
            cum += parseFloat(bids[i][1]);
            result[i] = cum;
        }
        return result;
    }, [bids]);

    const maxCum = useMemo(() => {
        const askMax = asksCum[0] ?? 0;
        const bidMax = bidsCum[bidsCum.length - 1] ?? 0;
        return Math.max(askMax, bidMax, 0.001);
    }, [asksCum, bidsCum]);

    const totalBidQty = bidsCum[bidsCum.length - 1] ?? 0;
    const totalAskQty = asksCum[0] ?? 0;
    const totalQty = totalBidQty + totalAskQty;
    const bidPct = totalQty > 0 ? Math.round((totalBidQty / totalQty) * 100) : 50;
    const askPct = 100 - bidPct;

    const formatPrice = useCallback((p: number) => {
        if (p >= 1000) return p.toFixed(1);
        if (p >= 1) return p.toFixed(2);
        return p.toFixed(4);
    }, []);

    const formatQty = useCallback((q: number) => {
        if (q >= 1000) return q.toFixed(2);
        if (q >= 1) return q.toFixed(4);
        return q.toFixed(6);
    }, []);

    const handleRowClick = (price: number) => {
        onPriceClick?.(price);
    };

    return (
        <div className={`rounded-xl border flex flex-col h-full overflow-hidden select-none ${
            isLight ? "bg-white border-neutral-200" : "bg-[#0b0e11] border-neutral-800"
        }`}>
            {/* 헤더 */}
            <div className={`flex items-center justify-between px-3 py-2 border-b ${
                isLight ? "border-neutral-200" : "border-neutral-800/80"
            }`}>
                <span className={`text-[11px] font-bold tracking-wide ${isLight ? "text-neutral-900" : "text-white"}`}>
                    Order Book
                </span>
            </div>

            {/* 컬럼 헤더 */}
            <div className={`flex items-center px-3 py-1.5 text-[10px] text-neutral-500 border-b ${
                isLight ? "border-neutral-200/60" : "border-neutral-800/40"
            }`}>
                <span className="flex-[2]">Price({coinName})</span>
                <span className="flex-[2] text-right">Qty({coinName})</span>
                <span className="flex-[2] text-right">Total({coinName})</span>
            </div>

            {/* 매도 호가 (asks) */}
            <div className="flex-1 overflow-hidden flex flex-col justify-end min-h-0">
                {sortedAsks.map((entry, i) => {
                    const price = parseFloat(entry[0]);
                    const qty = parseFloat(entry[1]);
                    const cum = asksCum[i] ?? 0;
                    const barWidth = (cum / maxCum) * 100;

                    return (
                        <div
                            key={`a-${i}`}
                            onClick={() => handleRowClick(price)}
                            className={`relative flex items-center px-3 h-[22px] cursor-pointer transition-colors ${
                                isLight ? "hover:bg-neutral-100 active:bg-neutral-200" : "hover:bg-white/[0.06] active:bg-white/[0.1]"
                            }`}
                        >
                            <div
                                className={`absolute right-0 top-0 bottom-0 transition-[width] duration-100 ${
                                    isLight ? "bg-red-500/[0.06]" : "bg-red-500/[0.08]"
                                }`}
                                style={{ width: `${barWidth}%` }}
                            />
                            <span className={`flex-[2] text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-red-600" : "text-red-400"
                            }`}>
                                {formatPrice(price)}
                            </span>
                            <span className={`flex-[2] text-right text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>
                                {formatQty(qty)}
                            </span>
                            <span className={`flex-[2] text-right text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                {formatQty(cum)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 현재가 */}
            <div className={`flex items-center px-3 py-2 border-y ${
                isLight ? "border-neutral-200 bg-neutral-50" : "border-neutral-700/60 bg-neutral-900/80"
            }`}>
                <div className="flex items-center gap-1.5">
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        className={priceUp
                            ? (isLight ? "text-emerald-600" : "text-emerald-400")
                            : (isLight ? "text-red-600" : "text-red-400")
                        }
                    >
                        <path
                            fill="currentColor"
                            d={priceUp ? "M7 14l5-5 5 5H7z" : "M7 10l5 5 5-5H7z"}
                        />
                    </svg>
                    <span
                        className={`text-[15px] font-bold font-mono tabular-nums ${
                            priceUp
                                ? (isLight ? "text-emerald-600" : "text-emerald-400")
                                : (isLight ? "text-red-600" : "text-red-400")
                        }`}
                    >
                        {currentPrice > 0 ? formatPrice(currentPrice) : "—"}
                    </span>
                </div>
                <span className="ml-auto text-[10px] text-neutral-500 font-mono">
                    ≈{currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}{" "}
                    USD
                </span>
            </div>

            {/* 매수 호가 (bids) */}
            <div className="flex-1 overflow-hidden min-h-0">
                {bids.map((entry, i) => {
                    const price = parseFloat(entry[0]);
                    const qty = parseFloat(entry[1]);
                    const cum = bidsCum[i] ?? 0;
                    const barWidth = (cum / maxCum) * 100;

                    return (
                        <div
                            key={`b-${i}`}
                            onClick={() => handleRowClick(price)}
                            className={`relative flex items-center px-3 h-[22px] cursor-pointer transition-colors ${
                                isLight ? "hover:bg-neutral-100 active:bg-neutral-200" : "hover:bg-white/[0.06] active:bg-white/[0.1]"
                            }`}
                        >
                            <div
                                className={`absolute right-0 top-0 bottom-0 transition-[width] duration-100 ${
                                    isLight ? "bg-emerald-500/[0.06]" : "bg-emerald-500/[0.08]"
                                }`}
                                style={{ width: `${barWidth}%` }}
                            />
                            <span className={`flex-[2] text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-emerald-600" : "text-emerald-400"
                            }`}>
                                {formatPrice(price)}
                            </span>
                            <span className={`flex-[2] text-right text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-neutral-700" : "text-neutral-300"
                            }`}>
                                {formatQty(qty)}
                            </span>
                            <span className={`flex-[2] text-right text-[11px] font-mono relative z-10 tabular-nums ${
                                isLight ? "text-neutral-500" : "text-neutral-400"
                            }`}>
                                {formatQty(cum)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* 매수/매도 비율 바 */}
            <div className={`px-3 py-2 border-t ${isLight ? "border-neutral-200/60" : "border-neutral-800/60"}`}>
                <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-neutral-500">B</span>
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${isLight ? "text-emerald-600" : "text-emerald-400"}`}>{bidPct}%</span>
                        <span className={isLight ? "text-neutral-400" : "text-neutral-600"}>/</span>
                        <span className={`font-medium ${isLight ? "text-red-600" : "text-red-400"}`}>{askPct}%</span>
                    </div>
                    <span className="text-neutral-500">S</span>
                </div>
                <div className="flex h-1 rounded-full overflow-hidden">
                    <div
                        className="bg-emerald-500 transition-all duration-300"
                        style={{ width: `${bidPct}%` }}
                    />
                    <div
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${askPct}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

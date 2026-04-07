"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { treemapOpenAtom } from "@/store/atoms";

type WhaleTrade = {
    id: string;
    symbol: string;
    side: "BUY" | "SELL";
    price: number;
    quantity: number;
    usdValue: number;
    timestamp: number;
};

type BinanceAggTrade = {
    e: "aggTrade";
    E: number;
    s: string;      // Symbol
    a: number;      // Aggregate trade ID
    p: string;      // Price
    q: string;      // Quantity
    T: number;      // Trade time
    m: boolean;     // Is buyer maker (true = 매도, false = 매수)
};

type CombinedStreamMessage = {
    stream: string;
    data: BinanceAggTrade;
};

// 감시할 코인 목록
const WATCH_SYMBOLS = ["btcusdt", "ethusdt", "solusdt", "bnbusdt", "xrpusdt"];

// 최소 표시 금액 (USD)
const MIN_USD_VALUE = 50000; // $50,000 이상만 표시
const MAX_ITEMS = 15;

type WhaleProps = {
    fadeDelay?: number;
    className?: string;
};

export default function WhaleTrades({ fadeDelay = 0, className = "" }: WhaleProps) {
    const [trades, setTrades] = useState<WhaleTrade[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    useEffect(() => {
        setMounted(true);
    }, []);

    // REST로 최근 대형 거래 즉시 로드
    useEffect(() => {
        if (isTreemapOpen) return;
        (async () => {
            try {
                const results = await Promise.all(
                    WATCH_SYMBOLS.map(async (s) => {
                        const res = await fetch(
                            `https://api.binance.com/api/v3/aggTrades?symbol=${s.toUpperCase()}&limit=80`
                        );
                        return (await res.json()) as { a: number; p: string; q: string; T: number; m: boolean; s?: string }[];
                    })
                );
                const all: WhaleTrade[] = [];
                results.forEach((rows, idx) => {
                    const sym = WATCH_SYMBOLS[idx].toUpperCase();
                    for (const r of rows) {
                        const price = parseFloat(r.p);
                        const qty = parseFloat(r.q);
                        const usd = price * qty;
                        if (usd < MIN_USD_VALUE) continue;
                        all.push({
                            id: `${sym}-${r.a}-init`,
                            symbol: sym.replace("USDT", ""),
                            side: r.m ? "SELL" : "BUY",
                            price, quantity: qty, usdValue: usd, timestamp: r.T,
                        });
                    }
                });
                all.sort((a, b) => b.timestamp - a.timestamp);
                setTrades((prev) => prev.length === 0 ? all.slice(0, MAX_ITEMS) : prev);
            } catch {}
        })();
    }, [isTreemapOpen]);

    useEffect(() => {
        if (isTreemapOpen) return;

        let destroyed = false;

        function connect() {
            if (destroyed) return;

            // Combined stream으로 여러 심볼 동시 감시
            const streams = WATCH_SYMBOLS.map((s) => `${s}@aggTrade`).join("/");
            const ws = new WebSocket(
                `wss://stream.binance.com:9443/stream?streams=${streams}`
            );
            wsRef.current = ws;

            ws.onopen = () => {
                if (!destroyed) setIsConnected(true);
            };

            ws.onmessage = (event: MessageEvent<string>) => {
                if (destroyed) return;
                try {
                    const msg = JSON.parse(event.data) as CombinedStreamMessage;
                    const data = msg.data;
                    if (data.e !== "aggTrade") return;

                    const price = parseFloat(data.p);
                    const quantity = parseFloat(data.q);
                    const usdValue = price * quantity;

                    // 최소 금액 필터
                    if (usdValue < MIN_USD_VALUE) return;

                    const trade: WhaleTrade = {
                        id: `${data.s}-${data.a}-${Date.now()}`,
                        symbol: data.s.replace("USDT", ""),
                        side: data.m ? "SELL" : "BUY", // m=true면 buyer가 maker = 매도
                        price,
                        quantity,
                        usdValue,
                        timestamp: data.T,
                    };

                    setTrades((prev) => [trade, ...prev].slice(0, MAX_ITEMS));
                } catch {
                    // ignore parse errors
                }
            };

            ws.onclose = () => {
                if (!destroyed) {
                    setIsConnected(false);
                    reconnectTimerRef.current = window.setTimeout(connect, 3000);
                }
            };

            ws.onerror = () => {
                try { ws.close(); } catch {}
            };
        }

        connect();

        return () => {
            destroyed = true;
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                try {
                    wsRef.current.onmessage = null;
                    wsRef.current.onclose = null;
                    wsRef.current.onerror = null;
                    wsRef.current.close();
                } catch {}
            }
        };
    }, [isTreemapOpen]);

    const formatValue = (value: number): string => {
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value.toFixed(0)}`;
    };

    const formatTime = (timestamp: number): string => {
        const diff = Date.now() - timestamp;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    };

    return (
        <div
            className={`relative flex-1 min-w-0 h-30 2xl:h-45 max-h-30 2xl:max-h-45 ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`relative flex h-full flex-col overflow-hidden transition-[opacity,transform] duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{
                    transitionDelay: `${fadeDelay}ms`,
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm 2xl:text-base text-neutral-100">
                            Whale Trades
                        </span>
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                isConnected ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            title={isConnected ? "Connected" : "Disconnected"}
                        />
                    </div>
                    <span className="text-[10px] 2xl:text-xs text-neutral-500">
                        $50K+
                    </span>
                </div>

                {/* 거래 리스트 */}
                <div className="flex-1 overflow-hidden">
                    {trades.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-600 animate-pulse"
                                    }`}
                                />
                                <span className="text-[10px] 2xl:text-xs text-neutral-500">
                                    {isConnected ? "Waiting for trades" : "Connecting"}
                                </span>
                                <span className="text-[10px] text-neutral-600 animate-pulse">···</span>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-1 overflow-y-auto max-h-full scrollbar-thin">
                            <AnimatePresence mode="popLayout">
                                {trades.map((trade) => (
                                    <motion.div
                                        key={trade.id}
                                        initial={{ opacity: 0, x: -20, height: 0 }}
                                        animate={{ opacity: 1, x: 0, height: "auto" }}
                                        exit={{ opacity: 0, x: 20, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className={`flex items-center justify-between py-1 px-1.5 rounded text-[11px] 2xl:text-xs ${
                                            trade.side === "BUY"
                                                ? "bg-emerald-500/10"
                                                : "bg-red-500/10"
                                        }`}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span
                                                className={`text-[10px] ${
                                                    trade.side === "BUY"
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                                }`}
                                            >
                                                {trade.side === "BUY" ? "▲" : "▼"}
                                            </span>
                                            <span className="text-neutral-200 font-medium">
                                                {trade.symbol}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                        <span
                                            className={`font-mono font-semibold ${
                                                trade.side === "BUY"
                                                    ? "text-emerald-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {formatValue(trade.usdValue)}
                                        </span>
                                        <span className="text-neutral-500 text-[10px] w-12 text-right">
                                            {formatTime(trade.timestamp)}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            </div>

            {/* 툴팁 */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-[235px] text-[11px] bg-neutral-950 border border-neutral-700 text-neutral-200 rounded-lg py-4 px-5 shadow-2xl z-50 pointer-events-none backdrop-blur-xl"
                    >
                        <div className="font-semibold text-amber-300 mb-1">
                            About this feed
                        </div>
                        <p className="leading-snug">
                            Large Binance spot trade prints.
                            <br />
                            <br />
                            • <b className="text-emerald-400">▲ Buy</b>: aggressive market buy
                            <br />
                            • <b className="text-red-400">▼ Sell</b>: aggressive market sell
                            <br />
                            <br />
                            Whale activity can be an
                            <br />
                            important directional signal.
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

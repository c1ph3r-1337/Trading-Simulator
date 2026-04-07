"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { treemapOpenAtom } from "@/store/atoms";

type Liquidation = {
    id: string;
    symbol: string;
    side: "LONG" | "SHORT"; // 청산된 포지션
    quantity: number;
    price: number;
    usdValue: number;
    timestamp: number;
};

type BinanceForceOrder = {
    e: "forceOrder";
    E: number;
    o: {
        s: string;      // Symbol
        S: "BUY" | "SELL"; // Side (청산의 반대방향)
        q: string;      // Quantity
        p: string;      // Price
        ap: string;     // Average Price
        X: string;      // Order Status
        T: number;      // Trade Time
    };
};

// 최소 표시 금액 (USD)
const MIN_USD_VALUE = 5000; // $5,000 이상만 표시
const MAX_ITEMS = 15;

type LiquidationProps = {
    fadeDelay?: number;
    className?: string;
};

export default function LiquidationFeed({ fadeDelay = 0, className = "" }: LiquidationProps) {
    const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [mounted, setMounted] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (isTreemapOpen) return;

        let destroyed = false;

        function connect() {
            if (destroyed) return;

            const ws = new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");
            wsRef.current = ws;

            ws.onopen = () => {
                if (!destroyed) setIsConnected(true);
            };

            ws.onmessage = (event: MessageEvent<string>) => {
                if (destroyed) return;
                try {
                    const data = JSON.parse(event.data) as BinanceForceOrder;
                    if (data.e !== "forceOrder") return;

                    const { o } = data;
                    const quantity = parseFloat(o.q);
                    const price = parseFloat(o.ap) || parseFloat(o.p);
                    const usdValue = quantity * price;

                    // 최소 금액 필터
                    if (usdValue < MIN_USD_VALUE) return;

                    const liquidation: Liquidation = {
                        id: `${o.s}-${o.T}-${Math.random()}`,
                        symbol: o.s.replace("USDT", ""),
                        side: o.S === "SELL" ? "LONG" : "SHORT", // SELL = 롱 청산, BUY = 숏 청산
                        quantity,
                        price,
                        usdValue,
                        timestamp: o.T,
                    };

                    setLiquidations((prev) => [liquidation, ...prev].slice(0, MAX_ITEMS));
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
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm 2xl:text-base text-neutral-100">
                        Live Liquidations
                    </span>
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            isConnected ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        title={isConnected ? "Connected" : "Disconnected"}
                    />
                </div>
                <span className="text-[10px] 2xl:text-xs text-neutral-500">
                    $5K+
                </span>
            </div>

            {/* 청산 리스트 */}
            <div className="flex-1 overflow-hidden">
                {liquidations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-neutral-600 animate-pulse"}`} />
                            <span className="text-[10px] 2xl:text-xs text-neutral-500">
                                {isConnected ? "Waiting for liquidations" : "Connecting"}
                            </span>
                            <span className="text-[10px] text-neutral-600 animate-pulse">···</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1 overflow-y-auto max-h-full scrollbar-thin">
                        <AnimatePresence mode="popLayout">
                            {liquidations.map((liq) => (
                                <motion.div
                                    key={liq.id}
                                    initial={{ opacity: 0, x: -20, height: 0 }}
                                    animate={{ opacity: 1, x: 0, height: "auto" }}
                                    exit={{ opacity: 0, x: 20, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={`flex items-center justify-between py-1 px-1.5 rounded text-[11px] 2xl:text-xs ${
                                        liq.side === "LONG"
                                            ? "bg-red-500/10"
                                            : "bg-emerald-500/10"
                                    }`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`font-bold text-[10px] ${
                                                liq.side === "LONG"
                                                    ? "text-red-400"
                                                    : "text-emerald-400"
                                            }`}
                                        >
                                            {liq.side === "LONG" ? "L" : "S"}
                                        </span>
                                        <span className="text-neutral-200 font-medium">
                                            {liq.symbol}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-mono font-semibold ${
                                                liq.side === "LONG"
                                                    ? "text-red-400"
                                                    : "text-emerald-400"
                                            }`}
                                        >
                                            {formatValue(liq.usdValue)}
                                        </span>
                                        <span className="text-neutral-500 text-[10px] w-12 text-right">
                                            {formatTime(liq.timestamp)}
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
                            Real-time forced liquidations from Binance futures.
                            <br />
                            <br />
                            • <b className="text-red-400">L (LONG)</b>: long position liquidated
                            <br />
                            • <b className="text-emerald-400">S (SHORT)</b>: short position liquidated
                            <br />
                            <br />
                            Large liquidations can signal
                            <br />
                            sharp price movement.
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

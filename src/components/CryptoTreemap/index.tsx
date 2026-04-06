"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

type Ticker = {
    symbol: string;
    priceChangePercent: string;
    quoteVolume: string;
    lastPrice: string;
};

type TreemapItem = {
    symbol: string;
    name: string;
    pct: number;
    volume: number;
    price: number;
};

const EXCLUDE_PATTERNS = /(UP|DOWN|BULL|BEAR|1000)/;

function isValidSymbol(sym: string) {
    return (
        sym.endsWith("USDT") &&
        !EXCLUDE_PATTERNS.test(sym) &&
        sym !== "USDCUSDT" &&
        sym !== "FDUSDUSDT"
    );
}

// Treemap 레이아웃 계산 (Squarified)
function squarify(
    items: TreemapItem[],
    x: number,
    y: number,
    width: number,
    height: number
): { item: TreemapItem; x: number; y: number; w: number; h: number }[] {
    if (items.length === 0) return [];

    const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);
    if (totalVolume === 0) return [];

    const result: { item: TreemapItem; x: number; y: number; w: number; h: number }[] = [];

    let remaining = [...items];
    let currentX = x;
    let currentY = y;
    let currentWidth = width;
    let currentHeight = height;

    while (remaining.length > 0) {
        const isHorizontal = currentWidth >= currentHeight;
        const side = isHorizontal ? currentHeight : currentWidth;

        const row: TreemapItem[] = [];
        let rowVolume = 0;
        const remainingVolume = remaining.reduce((sum, item) => sum + item.volume, 0);

        for (const item of remaining) {
            const testRow = [...row, item];
            const testVolume = rowVolume + item.volume;

            if (row.length === 0) {
                row.push(item);
                rowVolume = item.volume;
            } else {
                const currentWorst = worstRatio(row, rowVolume, side, remainingVolume, isHorizontal ? currentWidth : currentHeight);
                const testWorst = worstRatio(testRow, testVolume, side, remainingVolume, isHorizontal ? currentWidth : currentHeight);

                if (testWorst <= currentWorst) {
                    row.push(item);
                    rowVolume = testVolume;
                } else {
                    break;
                }
            }
        }

        // Layout row
        const rowRatio = rowVolume / remainingVolume;
        const rowSize = rowRatio * (isHorizontal ? currentWidth : currentHeight);

        let offset = 0;
        for (const item of row) {
            const itemRatio = item.volume / rowVolume;
            const itemSize = itemRatio * side;

            if (isHorizontal) {
                result.push({
                    item,
                    x: currentX,
                    y: currentY + offset,
                    w: rowSize,
                    h: itemSize,
                });
            } else {
                result.push({
                    item,
                    x: currentX + offset,
                    y: currentY,
                    w: itemSize,
                    h: rowSize,
                });
            }
            offset += itemSize;
        }

        // Update remaining area
        if (isHorizontal) {
            currentX += rowSize;
            currentWidth -= rowSize;
        } else {
            currentY += rowSize;
            currentHeight -= rowSize;
        }

        remaining = remaining.slice(row.length);
    }

    return result;
}

function worstRatio(
    row: TreemapItem[],
    rowVolume: number,
    side: number,
    totalVolume: number,
    fullSize: number
): number {
    const rowSize = (rowVolume / totalVolume) * fullSize;
    let worst = 0;

    for (const item of row) {
        const itemRatio = item.volume / rowVolume;
        const itemSize = itemRatio * side;
        const aspect = Math.max(rowSize / itemSize, itemSize / rowSize);
        worst = Math.max(worst, aspect);
    }

    return worst;
}

function getColor(pct: number): string {
    if (pct >= 5) return "rgb(22, 163, 74)"; // green-600
    if (pct >= 2) return "rgb(34, 197, 94)"; // green-500
    if (pct >= 0.5) return "rgb(74, 222, 128)"; // green-400
    if (pct > 0) return "rgb(134, 239, 172)"; // green-300
    if (pct === 0) return "rgb(115, 115, 115)"; // neutral-500
    if (pct > -0.5) return "rgb(252, 165, 165)"; // red-300
    if (pct > -2) return "rgb(248, 113, 113)"; // red-400
    if (pct > -5) return "rgb(239, 68, 68)"; // red-500
    return "rgb(220, 38, 38)"; // red-600
}

export default function CryptoTreemap({ onClose }: { onClose: () => void }) {
    const [data, setData] = useState<TreemapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [isLight, setIsLight] = useState(false);

    // 테마 감지
    useEffect(() => {
        const checkTheme = () => {
            setIsLight(document.documentElement.classList.contains("light"));
        };
        checkTheme();

        // MutationObserver로 클래스 변경 감지
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateDimensions = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
                if (!res.ok) return;
                const tickers = (await res.json()) as Ticker[];

                const items: TreemapItem[] = tickers
                    .filter((t) => isValidSymbol(t.symbol))
                    .map((t) => ({
                        symbol: t.symbol,
                        name: t.symbol.replace(/USDT$/, ""),
                        pct: parseFloat(t.priceChangePercent),
                        volume: parseFloat(t.quoteVolume),
                        price: parseFloat(t.lastPrice),
                    }))
                    .filter((t) => t.volume > 500000) // 거래량 50만 달러 이상
                    .sort((a, b) => b.volume - a.volume)
                    .slice(0, 150)
                    .map((t) => ({
                        ...t,
                        // 로그 스케일 적용하여 큰 코인과 작은 코인 차이 줄이기
                        volume: Math.pow(t.volume, 0.5),
                    }));

                setData(items);
                setLoading(false);
            } catch {
                setLoading(false);
            }
        };

        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, []);

    const layout = useMemo(() => {
        if (dimensions.width === 0 || data.length === 0) return [];
        return squarify(data, 0, 0, dimensions.width, dimensions.height);
    }, [data, dimensions]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] ${isLight ? "bg-neutral-100" : "bg-neutral-950"}`}
        >
            {/* Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
                <div className={`flex items-center gap-3 backdrop-blur-md rounded-xl px-4 py-2.5 border shadow-lg ${
                    isLight
                        ? "bg-white/90 border-neutral-300/50"
                        : "bg-neutral-900/90 border-neutral-700/50"
                }`}>
                    <h1 className={`text-sm 2xl:text-base font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}>Treemap</h1>
                    <div className={`w-px h-4 ${isLight ? "bg-neutral-300" : "bg-neutral-700"}`} />
                    <span className={`text-[11px] 2xl:text-xs ${isLight ? "text-neutral-500" : "text-neutral-400"}`}>
                        24h Quote Volume
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                        isLight
                            ? "bg-white/90 border-neutral-300/50 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
                            : "bg-neutral-900/90 border-neutral-700/50 text-neutral-400 hover:text-white hover:bg-neutral-800"
                    }`}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>

            {/* Treemap */}
            <div className="absolute inset-0">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`w-32 h-32 rounded animate-pulse ${isLight ? "bg-neutral-300" : "bg-neutral-800"}`} />
                    </div>
                ) : (
                    <svg width={dimensions.width} height={dimensions.height}>
                        {layout.map(({ item, x, y, w, h }) => {
                            // 박스 내부 여백 고려
                            const padding = 8;
                            const innerW = w - padding * 2;
                            const innerH = h - padding * 2;

                            // 이름 폰트 크기: 박스 너비에 맞게 계산 (글자당 ~0.6em 폭 가정)
                            const nameLen = item.name.length;
                            const fontByWidth = innerW / (nameLen * 0.65);
                            const fontByHeight = innerH / 3.5;
                            const fontByArea = Math.sqrt(innerW * innerH) / 4;
                            const fontSize = Math.min(fontByWidth, fontByHeight, fontByArea);

                            // 텍스트 표시 조건
                            const showName = w > 30 && h > 20 && fontSize >= 6;
                            const showPct = w > 40 && h > 35 && fontSize >= 8;
                            const showPrice = w > 50 && h > 50 && fontSize >= 10;

                            const formatPrice = (p: number) => {
                                if (p < 0.0001) return p.toPrecision(2);
                                if (p < 0.01) return p.toPrecision(3);
                                if (p < 1) return p.toFixed(4);
                                if (p < 1000) return p.toFixed(2);
                                return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
                            };

                            // 세로 배치 계산
                            const lineCount = 1 + (showPct ? 1 : 0) + (showPrice ? 1 : 0);
                            const lineHeight = Math.min(fontSize * 1.3, innerH / (lineCount + 0.5));
                            const totalHeight = lineHeight * lineCount;
                            const startY = y + h / 2 - totalHeight / 2 + lineHeight / 2;

                            // 각 요소별 폰트 크기
                            const nameFontSize = Math.max(6, Math.min(fontSize, 48));
                            const pctFontSize = Math.max(6, Math.min(fontSize * 0.7, 32));
                            const priceFontSize = Math.max(5, Math.min(fontSize * 0.55, 24));

                            return (
                                <g key={item.symbol}>
                                    <rect
                                        x={x + 1}
                                        y={y + 1}
                                        width={Math.max(0, w - 2)}
                                        height={Math.max(0, h - 2)}
                                        fill={getColor(item.pct)}
                                        rx={4}
                                        className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                                    />
                                    {showName && (
                                        <>
                                            {/* 코인 이름 */}
                                            <text
                                                x={x + w / 2}
                                                y={startY}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                                fill="white"
                                                fontSize={nameFontSize}
                                                fontWeight="bold"
                                                className="pointer-events-none"
                                            >
                                                {item.name}
                                            </text>
                                            {/* 퍼센트 */}
                                            {showPct && (
                                                <text
                                                    x={x + w / 2}
                                                    y={startY + lineHeight}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="white"
                                                    fontSize={pctFontSize}
                                                    className="pointer-events-none opacity-90"
                                                >
                                                    {item.pct >= 0 ? "+" : ""}{item.pct.toFixed(2)}%
                                                </text>
                                            )}
                                            {/* 가격 */}
                                            {showPrice && (
                                                <text
                                                    x={x + w / 2}
                                                    y={startY + lineHeight * 2}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="white"
                                                    fontSize={priceFontSize}
                                                    className="pointer-events-none opacity-80"
                                                >
                                                    ${formatPrice(item.price)}
                                                </text>
                                            )}
                                        </>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                )}
            </div>
        </motion.div>
    );
}

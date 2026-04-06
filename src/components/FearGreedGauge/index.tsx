"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
    value: number;
    title?: string;
    subLabel?: string;
    isLoading?: boolean;
    fadeDelay?: number;
};

export default function FearGreedGauge({
    value,
    title = "Fear & Greed Index",
    subLabel,
    isLoading = false,
    fadeDelay = 0,
}: Props) {
    const v = Math.max(0, Math.min(100, value));
    const [isHovered, setIsHovered] = useState(false);

    // 상태 텍스트 및 색상
    const getStateInfo = (val: number) => {
        if (val < 25) return { text: "Extreme Fear", color: "text-red-400", bg: "bg-red-500", bgLight: "bg-red-500/10" };
        if (val < 45) return { text: "Fear", color: "text-orange-400", bg: "bg-orange-500", bgLight: "bg-orange-500/10" };
        if (val < 55) return { text: "Neutral", color: "text-yellow-400", bg: "bg-yellow-500", bgLight: "bg-yellow-500/10" };
        if (val < 75) return { text: "Greed", color: "text-lime-400", bg: "bg-lime-500", bgLight: "bg-lime-500/10" };
        return { text: "Extreme Greed", color: "text-emerald-400", bg: "bg-emerald-500", bgLight: "bg-emerald-500/10" };
    };

    const state = getStateInfo(v);
    const displayLabel = subLabel ?? state.text;

    return (
        <div
            className="relative rounded-2xl border border-neutral-800 bg-neutral-900 p-4 2xl:p-5 text-white"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`transition-[opacity,transform] duration-700 ${isLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
                style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs 2xl:text-sm text-neutral-400 font-medium">
                        {title}
                    </h3>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] 2xl:text-xs font-medium ${state.bgLight} ${state.color}`}>
                        {displayLabel}
                    </div>
                </div>

                {/* 메인 숫자 */}
                <div className="flex items-baseline gap-2 mb-4">
                    <span className={`text-4xl 2xl:text-5xl font-bold tabular-nums ${state.color}`}>
                        {v}
                    </span>
                    <span className="text-neutral-500 text-sm">/100</span>
                </div>

                {/* 프로그레스 바 */}
                <div className="space-y-2">
                    <div className="relative h-2 rounded-full bg-neutral-800 overflow-hidden">
                        {/* 그라데이션 배경 (전체) */}
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)"
                            }}
                        />
                        {/* 진행 바 */}
                        <motion.div
                            className="absolute left-0 top-0 bottom-0 rounded-full"
                            style={{
                                background: "linear-gradient(to right, #ef4444, #f97316, #eab308, #84cc16, #22c55e)"
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${v}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                        {/* 인디케이터 */}
                        <motion.div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg border-2 border-neutral-900"
                            initial={{ left: 0 }}
                            animate={{ left: `calc(${v}% - 6px)` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        />
                    </div>

                    {/* 레이블 */}
                    <div className="flex justify-between text-[10px] 2xl:text-xs text-neutral-500">
                        <span>Fear</span>
                        <span>Greed</span>
                    </div>
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
                        className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+12px)] w-[240px] text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-xl py-3 px-4 shadow-xl z-50 pointer-events-none"
                    >
                        <p className="text-neutral-400 leading-relaxed">
                            This metric combines volatility, trading volume, and social trends into a 0-100 market sentiment score.
                        </p>
                        {/* 화살표 */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[6px] w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-neutral-700" />
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[4px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[5px] border-transparent border-b-neutral-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

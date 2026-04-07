"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useAtom } from "jotai";
import CryptoTreemap from "@/components/CryptoTreemap";
import { treemapOpenAtom, activePageAtom } from "@/store/atoms";

export default function FloatingLoginSidebar() {
    const [isDark, setIsDark] = useState(false);
    const [showTreemap, setShowTreemap] = useAtom(treemapOpenAtom);
    const [activePage, setActivePage] = useAtom(activePageAtom);
    const [showCalculator, setShowCalculator] = useState(false);
    const [display, setDisplay] = useState("0");
    const [usdAmount, setUsdAmount] = useState("1");
    const [inrRate, setInrRate] = useState<number | null>(null);
    const [fxDate, setFxDate] = useState<string | null>(null);
    const isSim = activePage === "sim";
    const pathname = usePathname();

    // 다크모드 초기화 (기본값: 라이트모드)
    useEffect(() => {
        const saved = localStorage.getItem("theme");
        const dark = saved === "dark"; // 저장된 값이 "dark"일 때만 다크모드
        setIsDark(dark);
        document.documentElement.classList.toggle("light", !dark);
    }, []);

    // 다크모드 토글
    const toggleTheme = () => {
        const newDark = !isDark;
        setIsDark(newDark);
        localStorage.setItem("theme", newDark ? "dark" : "light");
        document.documentElement.classList.toggle("light", !newDark);
    };

    useEffect(() => {
        let ignore = false;

        const loadFxRate = async () => {
            try {
                const res = await fetch("/api/fx-rate?base=USD&quote=INR", {
                    cache: "no-store",
                });
                if (!res.ok) return;

                const data = (await res.json()) as {
                    rate: number | null;
                    date: string | null;
                };

                if (ignore || data.rate == null) return;
                setInrRate(data.rate);
                setFxDate(data.date);
            } catch {}
        };

        void loadFxRate();
        return () => {
            ignore = true;
        };
    }, []);

    const inputCalc = (value: string) => {
        setDisplay((prev) => {
            if (prev === "0" || prev === "Error") return value;
            return `${prev}${value}`;
        });
    };

    const clearCalc = () => setDisplay("0");
    const backspaceCalc = () => {
        setDisplay((prev) => {
            if (prev.length <= 1 || prev === "Error") return "0";
            return prev.slice(0, -1);
        });
    };

    const evaluateCalc = () => {
        try {
            const sanitized = display.replace(/[^0-9+\-*/.()% ]/g, "");
            const result = Function(`"use strict"; return (${sanitized})`)();
            if (!Number.isFinite(result)) {
                setDisplay("Error");
                return;
            }
            setDisplay(String(result));
        } catch {
            setDisplay("Error");
        }
    };

    const parsedUsd = Number.parseFloat(usdAmount) || 0;
    const parsedRate = inrRate ?? 0;
    const inrValue = parsedUsd * parsedRate;
    const usdFromInr = parsedRate > 0 ? parsedUsd / parsedRate : 0;

    // 모바일 페이지에서는 플로팅 버튼 숨김
    if (pathname === "/mobile") return null;

    return (
        <>
            {/* FAB: 우하단 떠있는 버튼들 */}
            <div className="fixed bottom-5 right-5 z-[60] flex items-center gap-3">
                {/* 모의투자 버튼 */}
                <button
                    type="button"
                    onClick={() => setActivePage(isSim ? "main" : "sim")}
                    aria-label={isSim ? "Go to dashboard" : "Go to paper trading"}
                    className={`flex h-12 w-12 items-center cursor-pointer justify-center rounded-full shadow-lg hover:brightness-105 focus:outline-none transition-colors ${
                        isSim
                            ? isDark
                                ? "bg-emerald-600 text-white ring-1 ring-emerald-500/50"
                                : "bg-emerald-500 text-white ring-1 ring-emerald-400/50 shadow-md"
                            : isDark
                                ? "bg-zinc-700 text-amber-400 ring-1 ring-zinc-600/50"
                                : "bg-white text-amber-500 ring-1 ring-neutral-200 shadow-md"
                    }`}
                >
                    {isSim ? (
                        /* 홈 아이콘 */
                        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3L2 12h3v8z" />
                        </svg>
                    ) : (
                        /* 차트 아이콘 */
                        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M3 13h2v8H3v-8zm4-6h2v14H7V7zm4-4h2v18h-2V3zm4 8h2v10h-2V11zm4-3h2v13h-2V8z" />
                        </svg>
                    )}
                </button>

                {/* 트리맵 버튼 */}
                <button
                    type="button"
                    onClick={() => setShowTreemap(true)}
                    aria-label="Open treemap"
                    className={`flex h-12 w-12 items-center cursor-pointer justify-center rounded-full shadow-lg hover:brightness-105 focus:outline-none transition-colors ${
                        isDark
                            ? "bg-zinc-700 text-emerald-400 ring-1 ring-zinc-600/50"
                            : "bg-white text-emerald-600 ring-1 ring-neutral-200 shadow-md"
                    }`}
                >
                    {/* Grid 아이콘 */}
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            fill="currentColor"
                            d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"
                        />
                    </svg>
                </button>

                {/* 다크모드 토글 */}
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    className={`flex h-12 w-12 items-center cursor-pointer justify-center rounded-full shadow-lg hover:brightness-105 focus:outline-none transition-colors ${
                        isDark
                            ? "bg-zinc-700 text-yellow-300 ring-1 ring-zinc-600/50"
                            : "bg-white text-amber-500 ring-1 ring-neutral-200 shadow-md"
                    }`}
                >
                    {isDark ? (
                        /* 달 아이콘 (다크모드) */
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="currentColor"
                                d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26a5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"
                            />
                        </svg>
                    ) : (
                        /* 해 아이콘 (라이트모드) */
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fill="currentColor"
                                d="M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zm0-5a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1zm0 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.42 0l1.41 1.42a1 1 0 1 1-1.41 1.41L4.22 5.64a1 1 0 0 1 0-1.42zm14.14 14.14a1 1 0 0 1 1.42 0l1.41 1.42a1 1 0 1 1-1.41 1.41l-1.42-1.41a1 1 0 0 1 0-1.42zM2 12a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1zm18 0a1 1 0 0 1 1-1h2a1 1 0 1 1 0 2h-2a1 1 0 0 1-1-1zM5.64 18.36a1 1 0 0 1 0 1.42l-1.42 1.41a1 1 0 1 1-1.41-1.41l1.41-1.42a1 1 0 0 1 1.42 0zm12.72-12.72a1 1 0 0 1 0 1.42l-1.42 1.41a1 1 0 1 1-1.41-1.41l1.41-1.42a1 1 0 0 1 1.42 0z"
                            />
                        </svg>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setShowCalculator((prev) => !prev)}
                    aria-label={showCalculator ? "Close calculator" : "Open calculator"}
                    className={`flex h-12 w-12 items-center cursor-pointer justify-center rounded-full shadow-lg hover:brightness-105 focus:outline-none transition-colors ${
                        showCalculator
                            ? isDark
                                ? "bg-sky-500 text-white ring-1 ring-sky-400/50"
                                : "bg-sky-500 text-white ring-1 ring-sky-400/50 shadow-md"
                            : isDark
                                ? "bg-zinc-700 text-sky-300 ring-1 ring-zinc-600/50"
                                : "bg-white text-sky-600 ring-1 ring-neutral-200 shadow-md"
                    }`}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m0 2v4h10V4H7m2 7H7v2h2v-2m4 0h-2v2h2v-2m4 0h-2v2h2v-2m-8 4H7v2h2v-2m4 0h-2v2h2v-2m4 0h-2v2h2v-2Z" />
                    </svg>
                </button>

            </div>

            {showCalculator && (
                <div
                    className={`fixed bottom-21 right-5 z-[60] w-80 rounded-2xl border p-3 shadow-2xl ${
                        isDark
                            ? "border-zinc-700 bg-neutral-950"
                            : "border-neutral-200 bg-white"
                    }`}
                >
                    <div className="mb-3 flex items-center justify-between">
                        <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>
                            Calculator
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowCalculator(false)}
                            className={`rounded-md px-2 py-1 text-xs cursor-pointer ${isDark ? "text-zinc-400 hover:bg-zinc-800" : "text-neutral-500 hover:bg-neutral-100"}`}
                        >
                            Close
                        </button>
                    </div>

                    <div className={`mb-3 rounded-xl border px-3 py-4 text-right font-mono text-2xl ${isDark ? "border-zinc-800 bg-zinc-900 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-900"}`}>
                        {display}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: "C", action: clearCalc },
                            { label: "⌫", action: backspaceCalc },
                            { label: "%", action: () => inputCalc("%") },
                            { label: "/", action: () => inputCalc("/") },
                            { label: "7", action: () => inputCalc("7") },
                            { label: "8", action: () => inputCalc("8") },
                            { label: "9", action: () => inputCalc("9") },
                            { label: "*", action: () => inputCalc("*") },
                            { label: "4", action: () => inputCalc("4") },
                            { label: "5", action: () => inputCalc("5") },
                            { label: "6", action: () => inputCalc("6") },
                            { label: "-", action: () => inputCalc("-") },
                            { label: "1", action: () => inputCalc("1") },
                            { label: "2", action: () => inputCalc("2") },
                            { label: "3", action: () => inputCalc("3") },
                            { label: "+", action: () => inputCalc("+") },
                            { label: "0", action: () => inputCalc("0") },
                            { label: ".", action: () => inputCalc(".") },
                            { label: "(", action: () => inputCalc("(") },
                            { label: ")", action: () => inputCalc(")") },
                        ].map((key) => (
                            <button
                                key={key.label}
                                type="button"
                                onClick={key.action}
                                className={`rounded-xl py-3 text-sm font-semibold cursor-pointer transition-colors ${
                                    isDark
                                        ? "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                                        : "bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                                }`}
                            >
                                {key.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={evaluateCalc}
                            className="col-span-4 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white cursor-pointer transition-colors hover:bg-emerald-400"
                        >
                            =
                        </button>
                    </div>

                    <div className={`mt-4 rounded-2xl border p-3 ${isDark ? "border-zinc-800 bg-zinc-900/70" : "border-neutral-200 bg-neutral-50"}`}>
                        <div className={`mb-2 text-[11px] font-semibold uppercase tracking-widest ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>
                            USD / INR Converter
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="flex flex-col gap-1">
                                <span className={`text-[10px] ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>Amount</span>
                                <input
                                    type="number"
                                    value={usdAmount}
                                    onChange={(e) => setUsdAmount(e.target.value)}
                                    className={`rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "border-zinc-800 bg-zinc-950 text-white" : "border-neutral-200 bg-white text-neutral-900"}`}
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className={`text-[10px] ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>Live USD/INR</span>
                                <div className={`rounded-xl border px-3 py-2 text-sm ${isDark ? "border-zinc-800 bg-zinc-950 text-white" : "border-neutral-200 bg-white text-neutral-900"}`}>
                                    {inrRate == null
                                        ? "Loading..."
                                        : inrRate.toLocaleString("en-IN", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 4,
                                          })}
                                </div>
                            </label>
                        </div>

                        <div className={`mt-2 text-[10px] ${isDark ? "text-zinc-500" : "text-neutral-500"}`}>
                            Source: Frankfurter
                            {fxDate ? ` · Daily rate: ${fxDate}` : ""}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-zinc-800 bg-zinc-950 text-zinc-100" : "border-neutral-200 bg-white text-neutral-900"}`}>
                                <div className={`text-[10px] ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>USD to INR</div>
                                <div className="mt-1 font-mono font-semibold">
                                    {inrValue.toLocaleString("en-IN", {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })} INR
                                </div>
                            </div>

                            <div className={`rounded-xl border px-3 py-2 ${isDark ? "border-zinc-800 bg-zinc-950 text-zinc-100" : "border-neutral-200 bg-white text-neutral-900"}`}>
                                <div className={`text-[10px] ${isDark ? "text-zinc-400" : "text-neutral-500"}`}>INR to USD</div>
                                <div className="mt-1 font-mono font-semibold">
                                    {usdFromInr.toLocaleString("en-US", {
                                        minimumFractionDigits: 4,
                                        maximumFractionDigits: 4,
                                    })} USD
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 트리맵 */}
            <AnimatePresence>
                {showTreemap && (
                    <CryptoTreemap onClose={() => setShowTreemap(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

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

            </div>

            {/* 트리맵 */}
            <AnimatePresence>
                {showTreemap && (
                    <CryptoTreemap onClose={() => setShowTreemap(false)} />
                )}
            </AnimatePresence>
        </>
    );
}

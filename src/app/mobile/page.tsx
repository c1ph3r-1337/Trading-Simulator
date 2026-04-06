"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function MobilePage() {
    const [isLight, setIsLight] = useState(false);
    const [siteUrl, setSiteUrl] = useState("http://localhost:3000");

    useEffect(() => {
        const checkTheme = () => {
            setIsLight(document.documentElement.classList.contains("light"));
        };
        checkTheme();
        setSiteUrl(window.location.origin);
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, []);

    return (
        <div
            className={`min-h-screen flex flex-col ${isLight ? "bg-neutral-50" : "bg-neutral-950"}`}
        >
            {/* Header */}
            <header
                className={`px-6 py-4 border-b ${isLight ? "border-neutral-200" : "border-neutral-800"}`}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${isLight ? "bg-emerald-500" : "bg-emerald-600"}`}
                    >
                        <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <span
                        className={`font-semibold ${isLight ? "text-neutral-900" : "text-white"}`}
                    >
                        Trading Dashboard
                    </span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Icon */}
                <div
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 ${isLight ? "bg-neutral-200" : "bg-neutral-800"}`}
                >
                    <svg
                        className={`w-10 h-10 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>

                {/* Title */}
                <h1
                    className={`text-2xl font-bold mb-3 text-center ${isLight ? "text-neutral-900" : "text-white"}`}
                >
                    Please use a desktop browser
                </h1>
                <p
                    className={`text-center mb-8 ${isLight ? "text-neutral-500" : "text-neutral-400"}`}
                >
                    This service is optimized for desktop.
                    <br />
                    Real-time liquidations, whale trades, treemaps,
                    <br />
                    and crypto futures paper trading
                    <br />
                    work best on PC.
                </p>

                {/* URL Copy */}
                <div
                    className={`w-full max-w-sm rounded-xl p-4 mb-10 ${isLight ? "bg-neutral-100" : "bg-neutral-900"}`}
                >
                    <p
                        className={`text-xs mb-2 ${isLight ? "text-neutral-500" : "text-neutral-500"}`}
                    >
                        Site URL
                    </p>
                    <div className="flex items-center justify-between">
                        <span
                            className={`font-medium ${isLight ? "text-neutral-900" : "text-white"}`}
                        >
                            {siteUrl.replace(/^https?:\/\//, "")}
                        </span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(siteUrl);
                                alert("Address copied.");
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                isLight
                                    ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                            }`}
                        >
                            Copy
                        </button>
                    </div>
                </div>

                {/* Preview Images */}
                <div className="w-full max-w-sm">
                    <h2
                        className={`text-sm font-semibold mb-4 ${isLight ? "text-neutral-500" : "text-neutral-500"}`}
                    >
                        Main features
                    </h2>
                    <div className="space-y-4">
                        {/* Image 1 - 메인 대시보드 */}
                        <div
                            className={`rounded-xl overflow-hidden border ${isLight ? "border-neutral-200" : "border-neutral-800"}`}
                        >
                            <Image
                                src="/mobile-1.png"
                                alt="메인 대시보드"
                                width={400}
                                height={225}
                                className="w-full h-auto"
                            />
                            <div
                                className={`px-3 py-2 ${isLight ? "bg-neutral-100" : "bg-neutral-900"}`}
                            >
                                <p
                                    className={`text-xs font-medium ${isLight ? "text-neutral-700" : "text-neutral-300"}`}
                                >
                                    Real-time dashboard
                                </p>
                                <p
                                    className={`text-xs mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-500"}`}
                                >
                                    Live prices · liquidations · whale trades · kimchi premium · fear and greed · news · chat
                                </p>
                            </div>
                        </div>
                        {/* Image 2 - 트리맵 */}
                        <div
                            className={`rounded-xl overflow-hidden border ${isLight ? "border-neutral-200" : "border-neutral-800"}`}
                        >
                            <Image
                                src="/tree.png"
                                alt="트리맵"
                                width={400}
                                height={225}
                                className="w-full h-auto"
                            />
                            <div
                                className={`px-3 py-2 ${isLight ? "bg-neutral-100" : "bg-neutral-900"}`}
                            >
                                <p
                                    className={`text-xs font-medium ${isLight ? "text-neutral-700" : "text-neutral-300"}`}
                                >
                                    Volume treemap
                                </p>
                                <p
                                    className={`text-xs mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-500"}`}
                                >
                                    Visualize volume and price change across 150 coins
                                </p>
                            </div>
                        </div>
                        {/* Image 3 - 선물 모의투자 */}
                        <div
                            className={`rounded-xl overflow-hidden border ${isLight ? "border-neutral-200" : "border-neutral-800"}`}
                        >
                            <Image
                                src="/main-Image.png"
                                alt="선물 모의투자"
                                width={400}
                                height={225}
                                className="w-full h-auto"
                            />
                            <div
                                className={`px-3 py-2 ${isLight ? "bg-neutral-100" : "bg-neutral-900"}`}
                            >
                                <p
                                    className={`text-xs font-medium ${isLight ? "text-neutral-700" : "text-neutral-300"}`}
                                >
                                    Crypto futures paper trading
                                </p>
                                <p
                                    className={`text-xs mt-0.5 ${isLight ? "text-neutral-500" : "text-neutral-500"}`}
                                >
                                    Live-price long/short trading · up to 125x leverage · TP/SL
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer
                className={`px-6 py-6 text-center ${isLight ? "text-neutral-400" : "text-neutral-600"}`}
            >
                <p className="text-xs">© 2026 Trading Dashboard.</p>
            </footer>
        </div>
    );
}

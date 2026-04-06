"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SeoFooter from "../SeoFooter";
import Chat from "../Chat";
import PostBoard, { PostBoardHandle } from "../PostBoard";
import LiveStatsBox from "../LiveStatsBox";
import FearGreedWidget from "../Greed";
import YouTubeSeamlessPlayer from "@/components/YouTubeBGMPlayer";
import NewsPanel from "../NewsPanel";
import KimchiWidget from "@/components/KimchiWidget";
import HotSymbolsTicker from "../HotCoin";
import MarketIndicesWidget from "@/components/MarketIndicesWidget";

type TabKey = "board" | "news";

export const DashBoard = () => {
    const postRef = useRef<PostBoardHandle>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const router = useRouter();

    const pathname = usePathname() ?? "/"; // string 보장
    const sp = useSearchParams(); // ReadonlyURLSearchParams | null
    const paramsForRead = sp ?? new URLSearchParams(); // 읽기용 대체
    const paramsForWrite = new URLSearchParams(sp?.toString() ?? ""); // 쓰기용 복사본

    const raw = paramsForRead.get("tab");
    const activeTab: TabKey = raw === "board" ? "board" : "news";

    const switchTab = (next: TabKey) => {
        if (next === "news") {
            // 기본 탭이면 파라미터 제거해서 URL 깔끔히
            paramsForWrite.delete("tab");
        } else {
            paramsForWrite.set("tab", "board");
        }
        const qs = paramsForWrite.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    return (
        <>
            <section
                aria-label="Community board and chat"
                className="flex gap-5 mt-5 min-h-120 h-[calc(100vh-400px)] lg:h-[calc(100vh-200px)] 2xl:h-[calc(100vh-300px)] border-neutral-800"
            >
                {/* 왼쪽: 게시판/뉴스 카드 */}
                <article className="min-w-150 w-full h-full  rounded-2xl flex flex-col gap-3 p-3 bg-neutral-950 border border-zinc-800">
                    {/* 상단 바: 탭 + (우측) 글쓰기 버튼 */}
                    <div className={`relative z-20 flex items-center gap-3 px-2 2xl:py-2 2xl:min-h-14 transition-[opacity,transform] duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "50ms", transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                        <div className="inline-flex items-center rounded-xl bg-neutral-800/50 p-1 shrink-0">
                            <button
                                onClick={() => switchTab("board")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-all ${
                                    activeTab === "board"
                                        ? "bg-neutral-700 text-white shadow-sm"
                                        : "text-neutral-400 hover:text-neutral-200"
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                <span className="whitespace-nowrap">Board</span>
                            </button>
                            <button
                                onClick={() => switchTab("news")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all cursor-pointer ${
                                    activeTab === "news"
                                        ? "bg-neutral-700 text-white shadow-sm"
                                        : "text-neutral-400 hover:text-neutral-200"
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                                </svg>
                                <span className="whitespace-nowrap">News</span>
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <HotSymbolsTicker fadeDelay={150} />
                        </div>
                        <div className="ml-auto shrink-0 mr-1">
                            {activeTab === "board" && (
                                <button
                                    onClick={() => postRef.current?.openWrite()}
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] shadow-sm transition-all cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="whitespace-nowrap">Write</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="relative z-10 flex-1 min-h-0">
                        {activeTab === "board" ? (
                            <PostBoard ref={postRef} fadeDelay={100} />
                        ) : (
                            <NewsPanel roomId="lobby" fadeDelay={100} />
                        )}
                    </div>
                </article>

                <aside
                    aria-label="Trading widgets"
                    className="flex flex-col gap-5 min-w-57 2xl:min-w-80"
                >
                    <KimchiWidget fadeDelay={200} />
                    <LiveStatsBox fadeDelay={280} />
                    <FearGreedWidget fadeDelay={350} />
                    <YouTubeSeamlessPlayer videoId="j23SO29LNWE" />
                </aside>

                <div className="flex flex-col gap-5 min-w-115 2xl:min-w-140">
                    <MarketIndicesWidget fadeDelay={280} />
                    <aside
                        aria-label="Live chat"
                        className="border border-zinc-800 rounded-2xl flex-1 bg-neutral-950 overflow-hidden flex flex-col"
                    >
                        <div className="flex-1 min-h-0">
                            <Chat fadeDelay={350} />
                        </div>
                    </aside>
                </div>
            </section>
            <SeoFooter />
        </>
    );
};

export default DashBoard;

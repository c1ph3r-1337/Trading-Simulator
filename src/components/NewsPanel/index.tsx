"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useToast } from "@/components/Toast";

type NewsItem = {
    id: string;
    source: string;
    title: string;
    url: string;
    symbols: string[] | null;
    published_at: string;
};

export default function NewsPanel({ roomId, fadeDelay = 0 }: { roomId: string; fadeDelay?: number }) {
    const { showToast } = useToast();
    const [news, setNews] = useState<NewsItem[]>([]);
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // iframe viewer state
    const [viewer, setViewer] = useState<{ url: string; title: string } | null>(
        null
    );
    const [iframeReady, setIframeReady] = useState(false);
    const [iframeBlocked, setIframeBlocked] = useState(false);

    useEffect(() => {
        (async () => {
            const { data: sess } = await supabase.auth.getSession();
            setUserId(sess.session?.user?.id ?? null);

            const { data, error } = await supabase
                .from("news_items")
                .select("id,source,title,url,symbols,published_at")
                .order("published_at", { ascending: false })
                .limit(30);

            if (!error && data) setNews(data as NewsItem[]);
            setLoading(false);
        })();
    }, []);

    const shareToChat = async (n: NewsItem) => {
        if (!userId) return;
        const text = `[NEWS] ${n.title}  ${n.url}`;
        const { error } = await supabase
            .from("messages")
            .insert([{ room_id: roomId, user_id: userId, content: text }]);
        if (!error) {
            showToast("News shared to chat");
        }
    };

    // open/close modal
    const openViewer = (n: NewsItem) => {
        setViewer({ url: n.url, title: n.title });
        setIframeReady(false);
        setIframeBlocked(false);
    };
    const closeViewer = () => setViewer(null);

    // block background scroll while modal open
    useEffect(() => {
        if (!viewer) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [viewer]);

    // simple timeout-based fallback when XFO/CSP blocks the page (onLoad never fires)
    useEffect(() => {
        if (!viewer) return;
        setIframeReady(false);
        setIframeBlocked(false);
        const t = setTimeout(() => {
            if (!iframeReady) setIframeBlocked(true);
        }, 3500);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewer?.url]);

    return (
        <>
            {/* 스크롤바 숨김 유틸(전역 CSS로 옮겨두면 더 좋음) */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            .scrollbar-hide::-webkit-scrollbar{width:0!important;height:0!important;display:none}
            .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
          `,
                }}
            />

            {/* 카드 */}
            <div className="h-full min-h-0 flex flex-col rounded-xl border border-neutral-700 bg-neutral-900/70 overflow-hidden">
                {/* 본문 */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 pr-2 scrollbar-hide">
                    {/* 스켈레톤 로딩 */}
                    {loading && (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-3 animate-pulse">
                                    <div className="h-3 w-16 bg-neutral-700 rounded mb-2" />
                                    <div className="h-4 w-full bg-neutral-700 rounded mb-2" />
                                    <div className="h-4 w-3/4 bg-neutral-700 rounded mb-3" />
                                    <div className="flex gap-2">
                                        <div className="h-5 w-12 bg-neutral-700 rounded" />
                                        <div className="h-5 w-12 bg-neutral-700 rounded" />
                                        <div className="h-5 w-24 bg-neutral-700 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 실제 콘텐츠 */}
                    <div className={`transition-[opacity,transform] duration-700 ${loading ? "opacity-0 translate-y-4 hidden" : "opacity-100 translate-y-0"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                    {!news.length && !loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                            <svg className="w-10 h-10 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                            </svg>
                            <p className="text-xs">No news to display</p>
                        </div>
                    ) : !loading && (
                        <ul className="space-y-2">
                            {news.map((n) => (
                                <li
                                    key={n.id}
                                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2"
                                >
                                    {/* 모바일: 세로로 쌓임 / md 이상: 좌우 배치 */}
                                    <div className="md:flex md:items-start md:justify-between md:gap-3">
                                        {/* 왼쪽(내용) */}
                                        <div className="min-w-0 md:flex-1">
                                            <div className="text-xs text-neutral-400">
                                                [{n.source}]
                                            </div>

                                            {/* 제목은 모바일에서 2줄까지, md 이상은 한 줄 말줄임 */}
                                            <button
                                                className="block w-full text-left text-sm text-neutral-100 hover:underline line-clamp-2 md:line-clamp-1 cursor-pointer"
                                                title={n.title}
                                                onClick={() => openViewer(n)}
                                            >
                                                {n.title}
                                            </button>

                                            <div className="mt-1 flex flex-wrap gap-1 items-center">
                                                {(n.symbols ?? [])
                                                    .slice(0, 4)
                                                    .map((sym) => (
                                                        <span
                                                            key={sym}
                                                            className="rounded bg-neutral-800 px-2 py-[1px] text-[10px] text-neutral-300"
                                                        >
                                                            {sym}
                                                        </span>
                                                    ))}
                                                <span className="text-[10px] text-neutral-500">
                                                    {new Date(
                                                        n.published_at
                                                    ).toLocaleString("en-US", {
                                                        hour12: false,
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* 오른쪽(버튼영역) – 모바일에서는 아래로 내려오며 가로 100% */}
                                        <div className="mt-2 md:mt-0 md:ml-3 w-full md:w-auto flex gap-1.5 md:shrink-0">
                                            <button
                                                className="flex-1 md:flex-none rounded-lg cursor-pointer bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 active:bg-neutral-900 active:scale-[0.98] transition-all"
                                                onClick={() => openViewer(n)}
                                            >
                                                Open
                                            </button>
                                            <button
                                                disabled={!userId}
                                                onClick={() => shareToChat(n)}
                                                className={`flex-1 md:flex-none rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                                    userId
                                                        ? "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] cursor-pointer"
                                                        : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                                                }`}
                                            >
                                                Share
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    </div>
                </div>
            </div>

            {/* -------- IFRAME MODAL VIEWER -------- */}
            {viewer && (
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-[1px] flex items-center justify-center p-4"
                    onClick={closeViewer}
                >
                    <div
                        className="relative w-[90vw] max-w-5xl h-[80vh] rounded-xl overflow-hidden border border-neutral-700 bg-neutral-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top bar */}
                        <div className="absolute top-0 left-0 right-0 h-10 bg-neutral-900/90 border-b border-neutral-800 flex items-center gap-2 px-3">
                            <div
                                className="truncate text-sm text-neutral-200"
                                title={viewer.title}
                            >
                                {viewer.title}
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <a
                                    href={viewer.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 text-xs rounded bg-neutral-800 text-neutral-200 hover:bg-neutral-700 whitespace-nowrap"
                                >
                                    Open in new tab
                                </a>
                                <button
                                    onClick={closeViewer}
                                    className="px-2 py-1 text-xs rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 whitespace-nowrap cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Iframe container */}
                        <div className="absolute inset-x-0 top-10 bottom-0">
                            {!iframeReady && (
                                <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                                    {iframeBlocked ? (
                                        <div className="text-center space-y-2">
                                            <div>
                                                This site blocks embedding due to
                                                its security policy.
                                            </div>
                                            <a
                                                href={viewer.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-block px-3 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-xs"
                                            >
                                                Open in new tab
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-neutral-800 animate-pulse" />
                                    )}
                                </div>
                            )}

                            <iframe
                                key={viewer.url}
                                src={viewer.url}
                                title={viewer.title}
                                className="w-full h-full"
                                onLoad={() => setIframeReady(true)}
                                // 임베드 호환을 위해 scripts/同origin 허용 (부모에서 접근은 불가)
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

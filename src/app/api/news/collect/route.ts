export const runtime = "nodejs";

import Parser from "rss-parser";
import { supabaseAdmin } from "@/lib/supabase-admin";

/** 개별 피드 URL/소스 타입 */
type FeedUrl = { source: string; url: string };

/** RSS 항목 타입(우리가 쓰는 필드만 정의) */
type CustomItem = {
    title?: string;
    link?: string;
    isoDate?: string;
    pubDate?: string;
    contentSnippet?: string;
};

/** 피드 타입 */
type CustomFeed = {
    items: CustomItem[];
};

/** .env 없을 때 기본 한국어 소스 사용 */
function getFeedUrls(): FeedUrl[] {
    const raw = process.env.NEWS_FEEDS ?? "";
    const list = raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const defaults: string[] = [
        //"https://www.coindeskkorea.com/rss/allArticle.xml",
        // "https://www.tokenpost.kr/rss",
        "https://www.blockmedia.co.kr/feed",
        // "https://kr.cointelegraph.com/rss",
    ];

    const src = list.length ? list : defaults;

    return src.map((u): FeedUrl => {
        try {
            const host = new URL(u).hostname.replace(/^www\./, "");
            return { source: host, url: u };
        } catch {
            return { source: "custom", url: u };
        }
    });
}

/** 제목에서 간단 심볼 추출 */
function extractSymbols(text: string): string[] {
    const match = (text || "").match(/\b[A-Z]{2,6}\b/g);
    return match ? Array.from(new Set(match)).slice(0, 4) : [];
}

export async function GET(): Promise<Response> {
    try {
        const feeds = getFeedUrls();

        // 제네릭으로 커스텀 타입 지정
        const parser = new Parser<CustomFeed, CustomItem>({
            headers: { "User-Agent": "TradingDashboardBot/1.0" },
        });

        for (const f of feeds) {
            try {
                const feed = await parser.parseURL(f.url); // 타입: CustomFeed & { items: CustomItem[] }

                for (const item of feed.items ?? []) {
                    const title = item.title ?? "";
                    const url = item.link ?? "";
                    if (!title || !url) continue;

                    const published_at = new Date(
                        item.isoDate || item.pubDate || Date.now()
                    ).toISOString();

                    const { error } = await supabaseAdmin
                        .from("news_items")
                        .upsert(
                            [
                                {
                                    source: f.source,
                                    title,
                                    url,
                                    symbols: extractSymbols(title),
                                    summary:
                                        item.contentSnippet?.slice(0, 500) ??
                                        null,
                                    published_at,
                                },
                            ],
                            { onConflict: "url" }
                        );

                    if (error) {
                        console.error("[news upsert error]", error, url);
                    }
                }
            } catch (e) {
                console.error("[feed error]", f.url, e);
            }
        }

        return new Response("ok");
    } catch (e) {
        console.error("[collect fatal]", e);
        return new Response("error", { status: 500 });
    }
}

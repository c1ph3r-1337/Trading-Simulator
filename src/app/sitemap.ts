import type { MetadataRoute } from "next";
import { getAllNewsIds } from "@/lib/news";
import { getAllPostIds } from "@/lib/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    // 뉴스 항목 (최근 500개)
    const newsItems = await getAllNewsIds(500);
    const newsSitemap: MetadataRoute.Sitemap = newsItems.map((news) => ({
        url: `${base}/news/${news.id}`,
        lastModified: new Date(news.published_at),
        changeFrequency: "daily",
        priority: 0.7,
    }));

    // 게시글 항목 (최근 1000개)
    const postItems = await getAllPostIds(1000);
    const postsSitemap: MetadataRoute.Sitemap = postItems.map((post) => ({
        url: `${base}/posts/${post.id}`,
        lastModified: new Date(post.created_at),
        changeFrequency: "weekly",
        priority: 0.6,
    }));

    return [
        {
            url: `${base}/`,
            lastModified: new Date(),
            changeFrequency: "hourly",
            priority: 1,
        },
        ...newsSitemap,
        ...postsSitemap,
    ];
}

// ISR: 1시간마다 재생성
export const revalidate = 3600;

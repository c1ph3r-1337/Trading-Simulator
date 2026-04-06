import { supabaseAdmin } from "@/lib/supabase-admin";

export type NewsItem = {
    id: string;
    source: string;
    title: string;
    url: string;
    symbols: string[] | null;
    published_at: string;
};

// 서버 컴포넌트용: 단일 뉴스 조회
export async function getNewsById(id: string): Promise<NewsItem | null> {
    const { data, error } = await supabaseAdmin
        .from("news_items")
        .select("id, source, title, url, symbols, published_at")
        .eq("id", id)
        .single();

    if (error || !data) return null;
    return data as NewsItem;
}

// Sitemap 생성용: 전체 뉴스 ID 목록
export async function getAllNewsIds(limit = 500) {
    const { data, error } = await supabaseAdmin
        .from("news_items")
        .select("id, published_at")
        .order("published_at", { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

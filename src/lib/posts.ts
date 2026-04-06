import { supabase } from "@/lib/supabase-browser";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type Post = {
    id: string;
    title: string;
    body: string;
    user_id: string;
    created_at: string;
};

export async function fetchPosts({
    limit = 20,
    cursor,
}: {
    limit?: number;
    cursor?: string | null;
}) {
    let q = supabase
        .from("posts")
        .select("id, title, body, user_id, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(limit);
    if (cursor) q = q.lt("created_at", cursor); // 커서 기반 페이지네이션
    return await q;
}

export async function createPost({
    title,
    body,
    user_id,
}: {
    title: string;
    body: string;
    user_id: string;
}) {
    return await supabase
        .from("posts")
        .insert([{ title, body, user_id }])
        .select("id")
        .single();
}

export async function deletePost(id: string) {
    return await supabase.from("posts").delete().eq("id", id);
}

// 서버 컴포넌트용: 단일 게시글 조회
export async function getPostById(id: string): Promise<Post | null> {
    const { data, error } = await supabaseAdmin
        .from("posts")
        .select("id, title, body, user_id, created_at")
        .eq("id", id)
        .single();

    if (error || !data) return null;
    return data as Post;
}

// Sitemap 생성용: 전체 게시글 ID 목록
export async function getAllPostIds(limit = 1000) {
    const { data, error } = await supabaseAdmin
        .from("posts")
        .select("id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

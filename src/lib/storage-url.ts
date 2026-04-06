import { supabase } from "@/lib/supabase-browser";

const BUCKET = "imageS";

export function toPublicUrl(pathOrUrl?: string | null): string {
    try {
        if (!pathOrUrl) return "";

        // 이미 완전한 URL이면 그대로
        if (/^https?:\/\//i.test(pathOrUrl)) {
            return encodeURI(pathOrUrl); // 혹시 한글/공백 포함되어 있으면 인코딩
        }

        // 앞에 슬래시가 있으면 제거
        const clean = pathOrUrl.replace(/^\/+/, "");

        // 1차: SDK로 public URL 만들기
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(clean);
        if (data?.publicUrl) return data.publicUrl;

        // 2차: 수동 조립 (환경변수 사용)
        const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (base) {
            return `${base}/storage/v1/object/public/${BUCKET}/${encodeURI(
                clean
            )}`;
        }

        return "";
    } catch {
        return "";
    }
}

import { createClient, SupabaseClient } from "@supabase/supabase-js";

declare global {
    var __sb__: SupabaseClient | undefined;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase =
    globalThis.__sb__ ??
    createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            storage:
                typeof window !== "undefined" ? window.localStorage : undefined,
            storageKey: "sb-auth",
        },
    });

if (process.env.NODE_ENV !== "production") {
    globalThis.__sb__ = supabase;
}

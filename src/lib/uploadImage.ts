import { supabase } from "@/lib/supabase-browser";

function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadImageToBucket(file: File) {
    const safeName = sanitizeFileName(file.name);
    const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { error } = await supabase.storage.from("imageS").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
    });

    if (error) throw error;

    const { data: pub } = supabase.storage.from("imageS").getPublicUrl(path);

    return pub.publicUrl;
}

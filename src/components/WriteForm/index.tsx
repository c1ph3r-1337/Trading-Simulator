"use client";

import { useState } from "react";
import { uploadImageToBucket } from "@/lib/uploadImage";

export default function WriteForm({
    onCancel,
    onSubmit,
    initialTitle = "",
    initialBody = "",
    initialImage,
}: {
    onCancel: () => void;
    onSubmit: (title: string, body: string, imageUrl?: string) => void;
    initialTitle?: string;
    initialBody?: string;
    initialImage?: string;
}) {
    const [title, setTitle] = useState(initialTitle);
    const [body, setBody] = useState(initialBody);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setLoading(true);
        try {
            let imageUrl = initialImage;
            if (file) {
                imageUrl = await uploadImageToBucket(file);
            }
            await onSubmit(title.trim(), body.trim(), imageUrl);
        } catch (e: unknown) {
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Upload failed");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* 헤더 */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
                <h2 className="text-lg font-semibold text-white">
                    {initialTitle ? "Edit Post" : "New Post"}
                </h2>
                <button
                    onClick={onCancel}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 폼 */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-neutral-400">Title</label>
                        <span className={`text-[10px] ${title.length > 180 ? "text-amber-400" : "text-neutral-500"}`}>
                            {title.length}/200
                        </span>
                    </div>
                    <input
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                        placeholder="Enter a title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={200}
                    />
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-neutral-400">Content</label>
                        <span className={`text-[10px] ${body.length > 4500 ? "text-amber-400" : "text-neutral-500"}`}>
                            {body.length}/5000
                        </span>
                    </div>
                    <textarea
                        className="flex-1 w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-emerald-500 transition min-h-32"
                        placeholder="Write your content"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={5000}
                    />
                </div>

                <div>
                    <label className="block text-xs text-neutral-400 mb-1.5">Attach image</label>
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg cursor-pointer hover:border-neutral-600 transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-400">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21,15 16,10 5,21" />
                        </svg>
                        <span className="text-sm text-neutral-400">
                            {file ? file.name : "Choose image"}
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                    </label>
                </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4 mt-4 border-t border-neutral-800">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:bg-neutral-900 active:scale-[0.98] transition-all cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    onClick={submit}
                    disabled={loading || !title.trim() || !body.trim()}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
                >
                    {loading ? "Saving..." : "Publish"}
                </button>
            </div>
        </div>
    );
}

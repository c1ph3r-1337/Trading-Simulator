"use client";

import { supabase } from "@/lib/supabase-browser";
import { sanitizeText } from "@/lib/sanitize";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/Toast";

type Comment = {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
};

// Custom Modal Component (for alerts/confirms)
const CustomModal: React.FC<{
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isConfirm: boolean;
}> = ({ message, onConfirm, onCancel, isConfirm }) => {
    // 키보드 이벤트 처리
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={(el) => el?.focus()}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full outline-none"
            >
                <p className="text-white mb-6 text-base whitespace-pre-wrap">
                    {message}
                </p>
                <div
                    className={`flex ${
                        isConfirm ? "justify-between" : "justify-center"
                    } gap-3`}
                >
                    {isConfirm && (
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-neutral-700 text-white hover:bg-neutral-600 active:bg-neutral-800 active:scale-[0.98] transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        autoFocus
                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        {isConfirm ? "Confirm" : "Close"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function Comments({
    postId,
    userId,
}: {
    postId: string;
    userId: string | null;
}) {
    const { showToast } = useToast();
    const [list, setList] = useState<Comment[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<{
        message: string;
        isConfirm: boolean;
        onConfirm?: () => void;
    } | null>(null);

    const load = useCallback(async () => {
        setError(null);
        const { data, error: fetchError } = await supabase
            .from("comments")
            .select("id, post_id, user_id, body, created_at")
            .eq("post_id", postId)
            .order("created_at", { ascending: true });

        if (!fetchError && data) setList(data);
        else if (fetchError) setError("Failed to load comments: " + fetchError.message);
    }, [postId]);

    useEffect(() => {
        load();

        const channel = supabase
            .channel(`comments:${postId}`)
            .on(
                "postgres_changes",
                {
                    schema: "public",
                    table: "comments",
                    event: "INSERT",
                    filter: `post_id=eq.${postId}`,
                },
                (payload) => {
                    const newComment = payload.new as Comment;
                    setList((prev) =>
                        prev.some((c) => c.id === newComment.id) ? prev : [...prev, newComment]
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [postId, load]);

    // 댓글 추가
    const add = async () => {
        if (!userId) {
            setModal({
                message: "Sign in is required.",
                isConfirm: false,
            });
            return;
        }
        const sanitized = sanitizeText(text, 1000);
        if (!sanitized) return;
        setLoading(true);
        setError(null);

        const { data: inserted, error: insertError } = await supabase
            .from("comments")
            .insert([{ post_id: postId, user_id: userId, body: sanitized }])
            .select()
            .single();

        setLoading(false);
        if (insertError) {
            setModal({
                message: "Failed to post comment: " + insertError.message,
                isConfirm: false,
            });
            return;
        }

        // 즉시 UI 반영 (실시간 구독 중복 방지 포함)
        if (inserted) {
            setList((prev) =>
                prev.some((c) => c.id === inserted.id) ? prev : [...prev, inserted as Comment]
            );
            showToast("Comment posted");
        }
        setText("");
    };

    // 댓글 삭제
    const remove = (id: string) => {
        setModal({
            message: "Delete this comment?",
            isConfirm: true,
            onConfirm: async () => {
                setModal(null);
                const { error: deleteError } = await supabase
                    .from("comments")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", userId);

                if (deleteError) {
                    setModal({
                        message: "Failed to delete comment: " + deleteError.message,
                        isConfirm: false,
                    });
                    return;
                }

                setList((prev) => prev.filter((c) => c.id !== id));
                showToast("Comment deleted");
            },
        });
    };

    // 상대 시간 포맷
    const formatRelativeTime = (dateStr: string): string => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return "Just now";
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <div className="flex flex-col gap-3 scrollbar-hide">
            {/* 헤더 */}
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h4 className="font-semibold text-sm text-neutral-200">
                    Comments <span className="text-neutral-500 font-normal">{list.length}</span>
                </h4>
            </div>

            {/* 에러 메시지 */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 입력 */}
            <div className="space-y-1">
                <div className="flex gap-2">
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !loading && text.trim() && add()}
                        placeholder={userId ? "Write a comment" : "Sign in to comment"}
                        className="flex-1 rounded-lg px-3 py-2.5 text-sm bg-neutral-800/50 border border-neutral-700/50 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                        maxLength={1000}
                        disabled={!userId}
                    />
                    <button
                        onClick={add}
                        disabled={loading || !userId || !text.trim()}
                        className="px-4 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed disabled:active:scale-100 transition-all cursor-pointer"
                    >
                        {loading ? (
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : "Post"}
                    </button>
                </div>
                {text.length > 0 && (
                    <div className={`text-[10px] text-right ${text.length > 900 ? "text-amber-400" : "text-neutral-500"}`}>
                        {text.length}/1000
                    </div>
                )}
            </div>

            {/* 목록 */}
            <div className="space-y-2">
                <AnimatePresence>
                    {list.map((c) => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="group rounded-lg p-3 bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="text-xs font-medium text-neutral-300">
                                            {c.user_id.slice(0, 6)}
                                        </span>
                                        <span className="text-[10px] text-neutral-600">·</span>
                                        <span className="text-[10px] text-neutral-500">
                                            {formatRelativeTime(c.created_at)}
                                        </span>
                                    </div>
                                    <p className="whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed">
                                        {c.body}
                                    </p>
                                </div>
                                {userId === c.user_id && (
                                    <button
                                        onClick={() => remove(c.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {list.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-neutral-500">
                        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-xs">Be the first to comment</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modal && (
                    <CustomModal
                        message={modal.message}
                        isConfirm={modal.isConfirm}
                        onConfirm={modal.onConfirm || (() => setModal(null))}
                        onCancel={() => setModal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

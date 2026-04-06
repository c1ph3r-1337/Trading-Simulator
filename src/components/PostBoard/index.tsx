"use client";

import React, {
    useEffect,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import { supabase } from "@/lib/supabase-browser";
import { sanitizeText } from "@/lib/sanitize";
import WriteForm from "@/components/WriteForm";
import Comments from "@/components/Comment";
import Image from "next/image";
import { useToast } from "@/components/Toast";

type Post = {
    id: string;
    title: string;
    body: string;
    image_url?: string | null;
    user_id: string;
    created_at: string;
};

// Custom Modal Component
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
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            ref={(el) => el?.focus()}
        >
            <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 shadow-2xl max-w-sm w-full outline-none">
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
            </div>
        </div>
    );
};

// 부모가 호출할 수 있는 메서드 타입
export type PostBoardHandle = {
    openWrite: () => void;
    backToList: () => void;
};

type Props = {
    /** 내부에 예전처럼 '글쓰기' 버튼을 보여주고 싶을 때만 true */
    showInternalWriteButton?: boolean;
    fadeDelay?: number;
};

const PostBoard = forwardRef<PostBoardHandle, Props>(function PostBoard(
    { showInternalWriteButton = false, fadeDelay = 0 },
    ref
) {
    const { showToast } = useToast();
    const [posts, setPosts] = useState<Post[]>([]);
    const [postsLoaded, setPostsLoaded] = useState(false);
    const [mode, setMode] = useState<"list" | "write" | "detail" | "edit">(
        "list"
    );
    const [selected, setSelected] = useState<Post | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [modal, setModal] = useState<{
        message: string;
        isConfirm: boolean;
        onConfirm?: () => void;
    } | null>(null);

    // 부모에서 openWrite()/backToList() 호출 가능
    useImperativeHandle(
        ref,
        () => ({
            openWrite: () => setMode("write"),
            backToList: () => setMode("list"),
        }),
        []
    );

    // 로그인 세션 + 구독
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setUserId(data.session?.user?.id ?? null);
        });

        const { data: sub } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUserId(session?.user?.id ?? null);
            }
        );

        return () => sub.subscription.unsubscribe();
    }, []);

    const loadPosts = async () => {
        const { data, error } = await supabase
            .from("posts")
            .select("id,title,body,image_url,created_at,user_id")
            .order("created_at", { ascending: false });
        if (!error && data) setPosts(data as Post[]);
        setPostsLoaded(true);
    };

    useEffect(() => {
        loadPosts();
    }, []);

    // 생성
    const handleCreate = async (
        title: string,
        body: string,
        imageUrl?: string
    ) => {
        if (!userId) {
            setModal({ message: "Sign in is required.", isConfirm: false });
            return;
        }
        const safeTitle = sanitizeText(title, 200);
        const safeBody = sanitizeText(body, 5000);
        if (!safeTitle || !safeBody) {
            setModal({ message: "Please enter both a title and content.", isConfirm: false });
            return;
        }
        const { error } = await supabase
            .from("posts")
            .insert([
                { title: safeTitle, body: safeBody, image_url: imageUrl ?? null, user_id: userId },
            ]);
        if (error) {
            setModal({ message: error.message, isConfirm: false });
            return;
        }
        await loadPosts();
        setMode("list");
        showToast("Post published");
    };

    // 업데이트
    const handleUpdate = async (
        title: string,
        body: string,
        imageUrl?: string
    ) => {
        if (!selected) return;
        const safeTitle = sanitizeText(title, 200);
        const safeBody = sanitizeText(body, 5000);
        if (!safeTitle || !safeBody) {
            setModal({ message: "Please enter both a title and content.", isConfirm: false });
            return;
        }
        const { error } = await supabase
            .from("posts")
            .update({ title: safeTitle, body: safeBody, image_url: imageUrl ?? null })
            .eq("id", selected.id)
            .eq("user_id", userId);
        if (error) {
            setModal({ message: error.message, isConfirm: false });
            return;
        }
        await loadPosts();
        const fresh = posts.find((p) => p.id === selected.id);
        setSelected(fresh ?? null);
        setMode("detail");
        showToast("Post updated");
    };

    // 삭제
    const handleDelete = async (id: string) => {
        setModal({
            message: "Delete this post?",
            isConfirm: true,
            onConfirm: async () => {
                setModal(null);
                const { error } = await supabase
                    .from("posts")
                    .delete()
                    .eq("id", id)
                    .eq("user_id", userId);
                if (error) {
                    setModal({ message: error.message, isConfirm: false });
                    return;
                }
                await loadPosts();
                setMode("list");
                setSelected(null);
                showToast("Post deleted");
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

    // 썸네일 (목록)
    const Thumb = ({ url }: { url?: string | null }) =>
        url ? (
            <div className="w-16 h-16 2xl:w-20 2xl:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-800">
                <Image
                    src={url}
                    alt="thumb"
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                    unoptimized
                />
            </div>
        ) : null;

    // 본문 이미지 (상세)
    const DetailImage = ({ url }: { url?: string | null }) =>
        url ? (
            <div className="mt-4 rounded-lg overflow-hidden bg-neutral-900/50">
                <Image
                    src={url}
                    alt="Post image"
                    width={600}
                    height={400}
                    className="max-h-96 w-full object-contain"
                    unoptimized
                />
            </div>
        ) : null;

    return (
        <>
            <style
                dangerouslySetInnerHTML={{
                    __html: `
          .scrollbar-hide::-webkit-scrollbar{width:0!important;height:0!important;display:none}
          .scrollbar-hide{scrollbar-width:none;-ms-overflow-style:none}
        `,
                }}
            />

            <div className={`p-3 h-full flex flex-col min-h-0 transition-[opacity,transform] duration-700 ${postsLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                {/* 목록 */}
                {mode === "list" && (
                    <div className="flex-1 overflow-auto scrollbar-hide">
                        {/* 내부 글쓰기 버튼은 기본 숨김 (부모에서 우측 상단 버튼 사용) */}
                        {showInternalWriteButton && (
                            <button
                                onClick={() => setMode("write")}
                                className="mb-3 border rounded px-3 py-1 bg-black text-gray-100 cursor-pointer"
                            >
                               <span className="whitespace-nowrap">Write</span> 
                            </button>
                        )}

                        {/* 스켈레톤 로딩 */}
                        {!postsLoaded && (
                            <div className="space-y-2">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-neutral-800/30 animate-pulse">
                                        <div className="w-16 h-16 rounded-lg bg-neutral-700" />
                                        <div className="flex-1">
                                            <div className="h-4 w-3/4 bg-neutral-700 rounded mb-2" />
                                            <div className="h-3 w-full bg-neutral-700 rounded mb-1" />
                                            <div className="h-3 w-2/3 bg-neutral-700 rounded mb-3" />
                                            <div className="flex gap-2">
                                                <div className="h-3 w-16 bg-neutral-700 rounded" />
                                                <div className="h-3 w-12 bg-neutral-700 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {postsLoaded && posts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
                                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                <p className="text-sm">No posts yet</p>
                                <button
                                    onClick={() => setMode("write")}
                                    className="mt-3 text-sm text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                                >
                                    Write the first post
                                </button>
                            </div>
                        ) : postsLoaded && (
                            posts.map((p) => (
                                <div
                                    key={p.id}
                                    className="group flex items-start gap-3 p-3 mb-2 rounded-xl bg-neutral-800/30 hover:bg-neutral-800/60 border border-transparent hover:border-neutral-700/50 cursor-pointer transition-all duration-200"
                                    onClick={() => {
                                        setSelected(p);
                                        setMode("detail");
                                    }}
                                >
                                    <Thumb url={p.image_url} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm text-neutral-100 truncate group-hover:text-white transition-colors">
                                            {p.title}
                                        </h3>
                                        <p className="text-xs text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                                            {p.body}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-500">
                                            <span className="flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                {p.user_id.slice(0, 6)}
                                            </span>
                                            <span>·</span>
                                            <span>{formatRelativeTime(p.created_at)}</span>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* 상세 */}
                {mode === "detail" && selected && (
                    <div className="flex-1 overflow-auto scrollbar-hide">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between mb-4">
                            <button
                                className="flex items-center gap-1 text-sm text-neutral-400 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-neutral-800 hover:text-neutral-200 transition-all"
                                onClick={() => setMode("list")}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>

                            {userId && userId === selected.user_id && (
                                <div className="flex gap-2">
                                    <button
                                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-neutral-300 bg-neutral-800 cursor-pointer hover:bg-neutral-700 transition-all"
                                        onClick={() => setMode("edit")}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        수정
                                    </button>
                                    <button
                                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 transition-all"
                                        onClick={() => handleDelete(selected.id)}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        삭제
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 본문 */}
                        <article className="bg-neutral-800/30 rounded-xl p-4 2xl:p-5">
                            <h2 className="text-xl 2xl:text-2xl font-bold text-white mb-3">
                                {selected.title}
                            </h2>

                            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-neutral-700/50 text-xs text-neutral-500">
                                <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {selected.user_id.slice(0, 8)}
                                </span>
                                <span>·</span>
                                <span>{formatRelativeTime(selected.created_at)}</span>
                            </div>

                            <p className="whitespace-pre-wrap text-neutral-300 leading-relaxed">
                                {selected.body}
                            </p>
                            <DetailImage url={selected.image_url} />
                        </article>

                        {/* 댓글 */}
                        <div className="mt-4">
                            <Comments postId={selected.id} userId={userId} />
                        </div>
                    </div>
                )}

                {/* 글쓰기 */}
                {mode === "write" && (
                    <WriteForm
                        onCancel={() => setMode("list")}
                        onSubmit={handleCreate}
                    />
                )}

                {/* 수정 */}
                {mode === "edit" && selected && (
                    <WriteForm
                        initialTitle={selected.title}
                        initialBody={selected.body}
                        initialImage={selected.image_url ?? undefined}
                        onCancel={() => setMode("detail")}
                        onSubmit={handleUpdate}
                    />
                )}
            </div>

            {/* Custom Modal */}
            {modal && (
                <CustomModal
                    message={modal.message}
                    isConfirm={modal.isConfirm}
                    onConfirm={modal.onConfirm || (() => setModal(null))}
                    onCancel={() => setModal(null)}
                />
            )}
        </>
    );
});

export default PostBoard;

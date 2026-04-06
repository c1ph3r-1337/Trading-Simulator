"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase-browser";
import { sanitizeText } from "@/lib/sanitize";
import { AnimatePresence, motion } from "framer-motion";

interface PostgrestError {
    message: string;
    details: string | null;
    hint: string | null;
    code: string;
}
type PostgrestSingleResponse<T> = {
    data: T | null;
    error: PostgrestError | null;
    status: number;
    statusText: string;
};
interface PayloadObject {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    room_id: string;
    day?: string;
    choice?: "long" | "short";
}
type Msg = {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    room_id?: string;
};
type Position = {
    user_id: string;
    choice: "long" | "short";
    day: string;
    room_id: string;
};
type Ratio = {
    long_count: number;
    short_count: number;
    total: number;
    long_ratio: number; // 0~1
};

// --- Utils ---
function todayKstDateStr() {
    const nowKST = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const yyyy = nowKST.getFullYear();
    const mm = String(nowKST.getMonth() + 1).padStart(2, "0");
    const dd = String(nowKST.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

async function fetchRatio(roomId: string): Promise<Ratio> {
    const { data, error } = await supabase.rpc("get_long_short_ratio", {
        p_room_id: roomId,
    });
    if (error) throw error;
    return (
        (data?.[0] as Ratio) ?? {
            long_count: 0,
            short_count: 0,
            total: 0,
            long_ratio: 0,
        }
    );
}

/** 텍스트 내 URL 자동 감지 -> <a> 태그로 링크화 (안전: innerHTML 안 씀) */
function linkify(text: string): ReactNode[] {
    const parts: ReactNode[] = [];
    const regex = /((?:https?:\/\/|www\.)[^\s<]+)/gi; // 단순 URL 감지
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = regex.exec(text)) !== null) {
        const start = m.index;
        if (start > lastIndex) parts.push(text.slice(lastIndex, start));

        // 매치 문자열에서 문장부호 꼬리 제거
        const raw = m[0];
        const stripped = raw.replace(/[),.;!?]+$/g, "");
        const trailing = raw.slice(stripped.length);

        const href = stripped.startsWith("http")
            ? stripped
            : `https://${stripped}`;

        parts.push(
            <a
                key={`${start}-${href}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-emerald-300 break-anywhere"
            >
                {stripped}
            </a>
        );

        if (trailing) parts.push(trailing);
        lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
}

export default function Chat({ roomId = "lobby", fadeDelay = 0 }: { roomId?: string; fadeDelay?: number }) {
    const [userId, setUserId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_isAnonymous, setIsAnonymous] = useState(false);
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const userIdRef = useRef<string | null>(null);
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    const composingRef = useRef(false);
    const sendingRef = useRef(false);

    const scrollToBottom = () => {
        requestAnimationFrame(() => {
            listRef.current?.scrollTo({
                top: listRef.current!.scrollHeight,
                behavior: "smooth",
            });
        });
    };

    // session + auto anonymous login
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, s) => {
            if (s?.user) {
                setUserId(s.user.id);
                setIsAnonymous(s.user.is_anonymous ?? false);
            } else {
                const { data: anonData } = await supabase.auth.signInAnonymously();
                setUserId(anonData?.user?.id ?? null);
                setIsAnonymous(true);
            }
        });
        (async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setUserId(data.session.user.id);
                setIsAnonymous(data.session.user.is_anonymous ?? false);
            } else {
                const { data: anonData } = await supabase.auth.signInAnonymously();
                setUserId(anonData?.user?.id ?? null);
                setIsAnonymous(true);
            }
        })();
        return () => subscription.unsubscribe();
    }, []);

    // initial messages
    useEffect(() => {
        (async () => {
            const { data, error } = await supabase
                .from("messages")
                .select("id, content, created_at, user_id, room_id")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })
                .limit(300);

            if (!error && data) {
                setMsgs(data as Msg[]);
                requestAnimationFrame(() => {
                    listRef.current?.scrollTo({
                        top: listRef.current!.scrollHeight,
                    });
                });
            }
            setInitialLoading(false);
        })();
    }, [roomId]);

    /// realtime messages
    useEffect(() => {
        const channelName = `room:${roomId}`;
        supabase
            .getChannels()
            .filter((c) => c.topic === channelName)
            .forEach((c) => supabase.removeChannel(c));

        const ch = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    const newMsg = payload.new as Msg;
                    if (!newMsg?.id) return;

                    // ✅ 내 메시지도 포함해서 바로 붙이기 (중복만 방지)
                    setMsgs((prev) => {
                        if (prev.some((m) => m.id === newMsg.id)) return prev;
                        const next = [...prev, newMsg];

                        // 스크롤이 아래에 있으면 자동 스크롤, 아니면 unread 카운트 증가
                        if (listRef.current) {
                            const { scrollTop, scrollHeight, clientHeight } = listRef.current;
                            const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
                            if (isAtBottom) {
                                scrollToBottom();
                            } else if (newMsg.user_id !== userIdRef.current) {
                                setUnreadCount((c) => c + 1);
                            }
                        } else {
                            scrollToBottom();
                        }

                        return next;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [roomId]);

    const send = async () => {
        if (sendingRef.current) return;
        sendingRef.current = true;

        try {
            const text = sanitizeText(inputRef.current?.value ?? "", 2000);
            if (!text) return;

            // userId가 없으면 짧게 기다렸다가 재시도 (로그아웃 직후 익명 로그인 대기)
            if (!userIdRef.current) {
                await new Promise(resolve => setTimeout(resolve, 300));
                if (!userIdRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            if (!userIdRef.current) return;

            const { data, error } = await supabase
                .from("messages")
                .insert([
                    {
                        room_id: roomId,
                        user_id: userIdRef.current,
                        content: text,
                    },
                ])
                .select()
                .single();

            if (!error && data) {
                const newMsg = data as Msg;
                setMsgs((prev) => {
                    if (prev.some((m) => m.id === newMsg.id)) return prev;
                    const next = [...prev, newMsg];
                    scrollToBottom();
                    return next;
                });
            }

            if (inputRef.current) inputRef.current.value = "";
        } finally {
            setTimeout(() => (sendingRef.current = false), 0);
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (composingRef.current) return;
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter") {
            e.preventDefault();
            void send();
        }
    };

    // ----- Long/Short header state -----
    const [myChoice, setMyChoice] = useState<"long" | "short" | null>(null);
    const [ratio, setRatio] = useState<Ratio>({
        long_count: 0,
        short_count: 0,
        total: 0,
        long_ratio: 0,
    });
    const [loadingChoice, setLoadingChoice] = useState(true);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // 스크롤 위치 감지
    const handleScroll = () => {
        if (!listRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollBtn(distanceFromBottom > 100);
    };

    // 스크롤 버튼 클릭 시 읽음 처리
    const handleScrollBtnClick = () => {
        scrollToBottom();
        setUnreadCount(0);
    };

    // always load ratio (even when logged out)
    useEffect(() => {
        fetchRatio(roomId)
            .then(setRatio)
            .catch(() => {});
    }, [roomId]);

    // load my choice
    useEffect(() => {
        if (!userId) {
            setMyChoice(null);
            setLoadingChoice(false);
            return;
        }
        const init = async () => {
            const response = (await supabase
                .from("positions")
                .select("choice")
                .eq("room_id", roomId)
                .eq("day", todayKstDateStr())
                .eq("user_id", userId)
                .maybeSingle()) as PostgrestSingleResponse<{
                choice: "long" | "short";
            } | null>;

            const mine = response.data;
            if (mine) setMyChoice(mine.choice);
            setLoadingChoice(false);
        };
        init();
    }, [userId, roomId]);

    // nickname tags map
    const [positionsMap, setPositionsMap] = useState<
        Record<string, "long" | "short">
    >({});

    useEffect(() => {
        const loadPositions = async () => {
            const { data, error } = await supabase
                .from("positions")
                .select("user_id, choice")
                .eq("room_id", roomId)
                .eq("day", todayKstDateStr());
            if (!error && data) {
                const map: Record<string, "long" | "short"> = {};
                (data as Position[]).forEach(
                    (p) => (map[p.user_id] = p.choice)
                );
                setPositionsMap(map);
            }
        };
        loadPositions();
    }, [roomId]);

    useEffect(() => {
        const ch = supabase
            .channel(`positions:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "positions",
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    const today = todayKstDateStr();
                    const newPayload = payload.new as PayloadObject | null;
                    const oldPayload = payload.old as PayloadObject | null;
                    const newDay = newPayload?.day;
                    const oldDay = oldPayload?.day;
                    if (newDay !== today && oldDay !== today) return;

                    if (newPayload?.user_id && newPayload?.choice) {
                        setPositionsMap((prev) => ({
                            ...prev,
                            [newPayload.user_id]: newPayload.choice!,
                        }));
                    }
                    const r = await fetchRatio(roomId);
                    setRatio(r);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(ch);
        };
    }, [roomId]);

    const choose = async (choice: "long" | "short") => {
        if (!userId) return;
        const day = todayKstDateStr();
        const { error } = await supabase
            .from("positions")
            .upsert([{ user_id: userId, room_id: roomId, day, choice }], {
                onConflict: "user_id,room_id,day",
            });
        if (error) return;
        setMyChoice(choice);
        setPositionsMap((prev) => ({ ...prev, [userId]: choice }));
        // 비율 즉시 업데이트
        fetchRatio(roomId).then(setRatio).catch(() => {});
    };

    const longPct = Math.round(ratio.long_ratio * 100);

    return (
        <>
            {/* Scrollbar Hide + long-word wrap utility */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            .scrollbar-hide::-webkit-scrollbar { width: 0 !important; height: 0 !important; display: none; }
            .scrollbar-hide { scrollbar-width: none; -ms-overflow-style: none; }
            /* 긴 URL/토큰 줄바꿈 강제 */
            .break-anywhere { overflow-wrap: anywhere; word-break: break-word; }
          `,
                }}
            />
            <div className={`h-full flex flex-col p-3 text-white w-full transition-[opacity,transform] duration-700 ${initialLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                {/* 헤더 */}
                <div className="mb-3 rounded-xl border border-neutral-700 bg-neutral-900/80 p-3 space-y-2 shadow-lg">
                    <div className="flex justify-between items-center text-[12px]">
                        <div>
                            {loadingChoice && userId ? (
                                <span className="text-neutral-400">
                                    Loading position...
                                </span>
                            ) : (
                                <span className="font-semibold flex items-center gap-2">
                                    My Position:{" "}
                                    <b
                                        className={
                                            myChoice === "long"
                                                ? "text-green-400"
                                                : myChoice === "short"
                                                ? "text-red-400"
                                                : "text-neutral-400"
                                        }
                                    >
                                        {myChoice
                                            ? myChoice.toUpperCase()
                                            : "—"}
                                    </b>
                                    {myChoice && (
                                        <button
                                            onClick={() => setMyChoice(null)}
                                            className="text-[10px] text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-neutral-400 bg-neutral-800 px-2 py-[2px] rounded-full">
                            {ratio.total} participants
                        </div>
                    </div>

                    {/* 게이지 */}
                    <div className="relative w-full h-[10px] rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-red-600" />
                        <motion.div
                            className="absolute left-0 top-0 bottom-0 bg-emerald-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${longPct}%` }}
                            transition={{ duration: 0.45 }}
                        />
                        {ratio.total === 0 && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[7px] font-bold text-neutral-500"></div>
                        )}
                    </div>

                    {!myChoice && (
                        <div className="flex gap-2 pt-1">
                            <motion.button
                                whileHover={{ scale: userId ? 1.02 : 1 }}
                                whileTap={{ scale: userId ? 0.97 : 1 }}
                                disabled={!userId}
                                className={`px-3 py-2 rounded-lg text-white text-[13px] font-semibold flex-1 shadow-md transition-all ${
                                    userId
                                        ? "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 cursor-pointer"
                                        : "bg-neutral-700 cursor-not-allowed opacity-60"
                                }`}
                                onClick={() => choose("long")}
                            >
                                Long
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: userId ? 1.02 : 1 }}
                                whileTap={{ scale: userId ? 0.97 : 1 }}
                                disabled={!userId}
                                className={`px-3 py-2 rounded-lg text-white text-[13px] font-semibold flex-1 shadow-md transition-all ${
                                    userId
                                        ? "bg-red-600 hover:bg-red-500 active:bg-red-700 cursor-pointer"
                                        : "bg-neutral-700 cursor-not-allowed opacity-60"
                                }`}
                                onClick={() => choose("short")}
                            >
                                Short
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* 메시지 리스트 래퍼 */}
                <div className="relative flex-1 min-h-0">
                    <div
                        ref={listRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-y-auto space-y-2 pr-1 pb-8 scrollbar-hide"
                    >
                        {msgs.length > 0 ? (
                            msgs.map((m) => {
                                const userChoice = positionsMap[m.user_id];
                                const tag = userChoice
                                    ? `[${userChoice.toUpperCase()}] `
                                    : "";
                                const nameColor =
                                    m.user_id === userId
                                        ? "text-yellow-300"
                                        : "text-blue-400";
                                const tagColor =
                                    userChoice === "long"
                                        ? "text-green-400 font-semibold"
                                        : userChoice === "short"
                                        ? "text-red-400 font-semibold"
                                        : "text-neutral-500";

                                return (
                                    <motion.div
                                        key={m.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.25 }}
                                        className="text-[13px] border border-neutral-800 rounded-lg px-3 py-2 bg-neutral-900 shadow-sm min-w-0 max-w-full"
                                    >
                                        <b className={`${nameColor} text-[13px]`}>
                                            <span className={tagColor}>{tag}</span>
                                            {m.user_id === userId
                                                ? "Me"
                                                : m.user_id.slice(0, 8)}
                                        </b>
                                        <span className="mx-2 text-neutral-600">
                                            ·
                                        </span>
                                        <span className="text-neutral-300 text-[13px] whitespace-pre-wrap break-anywhere">
                                            {linkify(m.content)}
                                        </span>
                                    </motion.div>
                                );
                            })
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-[12px] text-neutral-500 text-center px-4">
                                    No messages yet. Take today’s first position
                                    and leave a message.
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 스크롤 투 바텀 버튼 (스크롤 영역 바깥에 고정) */}
                    <AnimatePresence>
                        {showScrollBtn && (
                            <motion.button
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                onClick={handleScrollBtnClick}
                                className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-800/95 border border-neutral-700 text-neutral-200 text-xs font-medium shadow-lg backdrop-blur-sm hover:bg-neutral-700 transition-colors cursor-pointer z-20"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                {unreadCount > 0 ? `${unreadCount} new messages` : "Latest messages"}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* 입력바 */}
                <div className="border-t border-neutral-800 pt-1">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            onCompositionStart={() =>
                                (composingRef.current = true)
                            }
                            onCompositionEnd={() =>
                                (composingRef.current = false)
                            }
                            onKeyDown={onKeyDown}
                            className="flex-1 border border-neutral-700 px-3 py-2.5 rounded-lg bg-neutral-900 text-gray-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 text-[13px] shadow-inner"
                            placeholder="Anonymous chat is allowed"
                            maxLength={2000}
                            disabled={!userId}
                        />
                        <motion.button
                            whileHover={{ scale: userId ? 1.02 : 1 }}
                            whileTap={{ scale: userId ? 0.97 : 1 }}
                            type="button"
                            onClick={send}
                            className={`px-4 py-2.5 rounded-lg transition-all duration-150 text-[13px] font-semibold shadow ${
                                userId
                                    ? "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 cursor-pointer"
                                    : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                            }`}
                            disabled={!userId}
                        >
                            Send
                        </motion.button>
                    </div>
                </div>
            </div>
        </>
    );
}

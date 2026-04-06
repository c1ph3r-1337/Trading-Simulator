"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { supabase } from "@/lib/supabase-browser";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { treemapOpenAtom } from "@/store/atoms";
import AnimatedNumber from "@/components/AnimatedNumber";

/** 브라우저 당 고정되는 익명 디바이스 ID */
function getDeviceId() {
    if (typeof window === "undefined") return "server";
    const KEY = "th_device_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(KEY, id);
    }
    return id;
}

export default function LiveStatsBox({ fadeDelay = 0 }: { fadeDelay?: number } = {}) {
    const deviceIdRef = useRef<string>(getDeviceId());
    const [onlineNow, setOnlineNow] = useState<number>(0);
    const [ready, setReady] = useState(false);
    const [connected, setConnected] = useState<boolean>(false);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    const today = new Date().toISOString().slice(0, 10);

    // 오늘 방문(유니크) 기록: 마운트 시 1번만 upsert
    useEffect(() => {
        const upsertVisit = async () => {
            await supabase
                .from("visits")
                .upsert([{ day: today, device_id: deviceIdRef.current }], {
                    onConflict: "day,device_id",
                });
        };
        void upsertVisit();
    }, [today]);

    // 현재 접속자 수 조회 (최근 60초 내 활동)
    const fetchOnline = useCallback(async () => {
        const { count, error } = await supabase
            .from("presence")
            .select("device_id", { count: "exact", head: true })
            .gt("last_seen", new Date(Date.now() - 60_000).toISOString());

        if (!error) {
            setOnlineNow(count ?? 0);
            setReady(true);
        }
    }, []);

    // presence heartbeat + 접속자 조회 (탭 활성화 시에만)
    const heartbeatAndFetch = useCallback(async () => {
        // heartbeat 전송
        await supabase.from("presence").upsert(
            [
                {
                    device_id: deviceIdRef.current,
                    last_seen: new Date().toISOString(),
                },
            ],
            { onConflict: "device_id" },
        );
        // 접속자 수 조회
        await fetchOnline();
    }, [fetchOnline]);

    // 탭 비활성화 또는 트리맵 열림 시 폴링 중단
    useVisibilityPolling({
        interval: 15_000,
        onPoll: heartbeatAndFetch,
        immediate: true,
        enabled: !isTreemapOpen,
    });

    // Realtime 구독 (presence 변경 시 즉시 반영)
    useEffect(() => {
        const channel = supabase
            .channel("presence-watch")
            .on(
                "postgres_changes",
                { schema: "public", table: "presence", event: "*" },
                () => void fetchOnline(),
            )
            .subscribe((status) => {
                setConnected(status === "SUBSCRIBED");
            });

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [fetchOnline]);

    return (
        <div className={`flex items-center gap-3 2xl:gap-4 rounded-2xl border border-neutral-800 p-3 2xl:p-4 shadow-sm justify-center bg-neutral-900 transition-[opacity,transform] duration-700 ${ready ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <span className="text-xs 2xl:text-sm flex gap-2 whitespace-nowrap text-gray-300">
                <b>Online now </b>
                <b><AnimatedNumber value={onlineNow} /></b>
            </span>
            <span
                className={`inline-block h-2 w-2 2xl:h-3 2xl:w-3 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-gray-300"
                }`}
                title={connected ? "Realtime connected" : "Disconnected"}
            />
        </div>
    );
}

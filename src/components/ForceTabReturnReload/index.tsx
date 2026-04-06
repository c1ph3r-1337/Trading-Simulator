// components/ForceTabReturnReload.tsx
"use client";
import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { activePageAtom } from "@/store/atoms";

// pageshow 이벤트 타입가드
function hasPersisted(e: unknown): e is { persisted: boolean } {
    return (
        !!e && typeof (e as Record<string, unknown>).persisted === "boolean"
    );
}

export default function ForceTabReturnReload() {
    const wasHiddenRef = useRef(false);
    const activePage = useAtomValue(activePageAtom);
    const activePageRef = useRef(activePage);

    // ref를 최신 상태로 유지
    useEffect(() => {
        activePageRef.current = activePage;
    }, [activePage]);

    useEffect(() => {
        // ▶ 로드되자마자 __rv 있으면 깨끗이 치우기 (URL만 교체, 페이지는 안 바뀜)
        const cleanOnce = () => {
            const u = new URL(window.location.href);
            if (u.searchParams.has("__rv")) {
                u.searchParams.delete("__rv");
                window.history.replaceState(null, "", u.toString());
            }
        };
        cleanOnce();

        const hardReload = () => {
            // 모의투자 페이지에서는 리로드하지 않음
            if (activePageRef.current === "sim") return;

            const u = new URL(window.location.href);
            // ▶ 덧붙이지 않고 set으로 덮어쓰기 (중복 방지)
            u.searchParams.set("__rv", String(Date.now()));
            window.location.replace(u.toString());
        };

        const onVisibility = () => {
            const vs = document.visibilityState;
            if (vs === "hidden") wasHiddenRef.current = true;
            else if (vs === "visible" && wasHiddenRef.current) hardReload();
        };

        const onPageShow = (e: Event) => {
            // bfcache에서 돌아오면 강제 새로고침
            if (hasPersisted(e) && e.persisted) hardReload();
        };

        const onFocus = () => {
            if (
                document.visibilityState === "visible" &&
                wasHiddenRef.current
            ) {
                hardReload();
            }
        };

        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onPageShow as EventListener);
        window.addEventListener("focus", onFocus);

        return () => {
            document.removeEventListener("visibilitychange", onVisibility);
            window.removeEventListener(
                "pageshow",
                onPageShow as EventListener
            );
            window.removeEventListener("focus", onFocus);
        };
    }, []);

    return null;
}

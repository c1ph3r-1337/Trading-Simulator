"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseVisibilityPollingOptions {
    /** 폴링 간격 (ms) */
    interval: number;
    /** 폴링 함수 */
    onPoll: () => Promise<void> | void;
    /** 즉시 실행 여부 (기본: true) */
    immediate?: boolean;
    /** 활성화 여부 (기본: true) */
    enabled?: boolean;
}

/**
 * 탭이 활성화되었을 때만 폴링을 실행하는 훅
 * - 탭 비활성화 시 폴링 중단 → 네트워크 요청 절약
 * - 탭 활성화 시 즉시 1회 실행 후 폴링 재개
 */
export function useVisibilityPolling({
    interval,
    onPoll,
    immediate = true,
    enabled = true,
}: UseVisibilityPollingOptions) {
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    const poll = useCallback(async () => {
        if (isPollingRef.current) return; // 중복 실행 방지
        isPollingRef.current = true;
        try {
            await onPoll();
        } finally {
            isPollingRef.current = false;
        }
    }, [onPoll]);

    const startPolling = useCallback(() => {
        if (timerRef.current) return;
        timerRef.current = setInterval(poll, interval);
    }, [poll, interval]);

    const stopPolling = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            stopPolling();
            return;
        }

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                // 탭 활성화 시 즉시 1회 실행
                void poll();
                startPolling();
            }
        };

        // 초기 실행
        if (immediate && !document.hidden) {
            void poll();
        }

        // 탭이 보이면 폴링 시작
        if (!document.hidden) {
            startPolling();
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enabled, immediate, poll, startPolling, stopPolling]);

    return { poll, startPolling, stopPolling };
}

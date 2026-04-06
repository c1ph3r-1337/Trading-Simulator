"use client";
import { useEffect, useRef } from "react";

// 현재 사용 x
export default function EconomicCalendarKR() {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!ref.current) return;

        // 기존 스크립트 제거(중복 방지)
        ref.current.innerHTML = "";

        const s = document.createElement("script");
        s.src =
            "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
        s.async = true;
        s.innerHTML = JSON.stringify({
            width: "100%",
            height: 420,
            importanceFilter: "-1,0,1", // 중요도 전체
            currencyFilter: "USD,KRW,EUR", // 원하는 통화만
            locale: "ko", // 한국어
            isTransparent: true,
        });
        ref.current.appendChild(s);
    }, []);

    return (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900/70 p-3">
            <div className="mb-2 text-sm font-semibold">
                이번 달 주요 경제지표
            </div>
            <div ref={ref} className="tradingview-widget-container w-full" />
        </div>
    );
}

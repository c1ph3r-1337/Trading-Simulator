"use client";

import dynamic from "next/dynamic";
import { CoinPriceBox } from "@/components/CoinPriceBox";
import LiquidationFeed from "@/components/LiquidationFeed";
import WhaleTrades from "@/components/WhaleTrades";

const CoinChart = dynamic(() => import("@/components/CoinChart"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-35 2xl:min-h-50 bg-neutral-900 rounded-xl animate-pulse" />
    ),
});

export const RealTimeSection = () => {
    return (
        <section
            aria-label="실시간 코인 가격 및 차트"
            className="realtime-section font-sans flex gap-3 2xl:gap-5 min-h-35 2xl:min-h-50 mt-4 mx-auto bg-neutral-950 items-center w-full min-w-[1320px] border border-zinc-800 rounded-2xl px-4 2xl:px-6"
        >
            {/* 코인 가격 박스들 - 비율 3 */}
            <div className="flex gap-2 2xl:gap-3 flex-[3] min-w-0">
                <CoinPriceBox boxId="tile-1" defaultSymbol="btcusdt" fadeDelay={0} />
                <CoinPriceBox boxId="tile-2" defaultSymbol="ethusdt" fadeDelay={80} />
                <CoinPriceBox boxId="tile-3" defaultSymbol="xrpusdt" fadeDelay={160} />
                <CoinPriceBox boxId="tile-4" defaultSymbol="solusdt" fadeDelay={240} />
            </div>

            {/* 차트 - 비율 2 */}
            <div className="flex-[2] min-w-0">
                <CoinChart fadeDelay={300} />
            </div>

            {/* 고래 거래 + 청산 피드 - 비율 2 */}
            <div className="flex gap-2 2xl:gap-4 flex-[2] min-w-0">
                <WhaleTrades fadeDelay={380} />
                <LiquidationFeed fadeDelay={460} />
            </div>
        </section>
    );
};

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
            aria-label="Real-time trading board"
            className="realtime-section font-sans mt-5 w-full"
        >
            <div className="relative grid gap-3 xl:grid-cols-8">
                {/* 4 Coins - 1 Column Each (Total 4/8) */}
                {[["BTCUSDT", 0], ["ETHUSDT", 80], ["XRPUSDT", 160], ["SOLUSDT", 240]].map(
                    ([sym, delay]) => (
                        <div key={sym} className="xl:col-span-1 h-full min-h-[200px]">
                            <CoinPriceBox
                                boxId={`tile-${sym}`}
                                defaultSymbol={sym.toString().toLowerCase()}
                                fadeDelay={delay as number}
                                className="h-full"
                            />
                        </div>
                    ),
                )}

                {/* Chart - 2 Columns (Total 2/8) */}
                <div className="xl:col-span-2 h-full min-h-[200px] rounded-[22px] border border-white/5 bg-neutral-900/40 p-3 flex flex-col backdrop-blur-sm shadow-lg">
                    <div className="mb-2 flex items-center justify-between px-1 flex-shrink-0">
                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 animate-pulse" />
                            <span>Live Market Chart</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden rounded-[14px]">
                        <CoinChart
                            fadeDelay={300}
                            showIndicators={false}
                            hideIntervals={true}
                            className="h-full"
                        />
                    </div>
                </div>
                {/* Whale Trades - 1 Column (Total 1/8) */}
                <div className="xl:col-span-1 h-full min-h-[200px] rounded-[22px] border border-white/5 bg-neutral-900/40 p-3.5 backdrop-blur-sm shadow-lg">
                    <WhaleTrades fadeDelay={380} className="h-full" />
                </div>

                {/* Liquidations - 1 Column (Total 1/8) */}
                <div className="xl:col-span-1 h-full min-h-[200px] rounded-[22px] border border-white/5 bg-neutral-900/40 p-3.5 backdrop-blur-sm shadow-lg">
                    <LiquidationFeed fadeDelay={460} className="h-full" />
                </div>            </div>
        </section>
    );
};

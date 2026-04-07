"use client";

import FxRateWidget from "@/components/FxRateWidget";
import MarketIndicesWidget from "@/components/MarketIndicesWidget";
import LongShortRatioBox from "@/components/LongShortRatioBox";

export const DashBoard = () => {
    return (
        <>
            <section
                aria-label="Market overview"
                className="mt-5 flex min-h-120 flex-col gap-5"
            >
                <div className="rounded-2xl border border-zinc-800 bg-neutral-950 p-3">
                    <MarketIndicesWidget fadeDelay={120} />
                </div>

                <div className="grid gap-5 xl:grid-cols-3">
                    <FxRateWidget fadeDelay={180} className="min-h-[24rem]" />

                    <LongShortRatioBox
                        symbol="BTCUSDT"
                        source="global"
                        period="5m"
                        pollMs={30000}
                        className="min-h-[24rem]"
                    />

                    <LongShortRatioBox
                        symbol="BTCUSDT"
                        source="top-trader"
                        period="5m"
                        pollMs={30000}
                        className="min-h-[24rem]"
                    />
                </div>
            </section>
        </>
    );
};

export default DashBoard;

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useAtomValue } from "jotai";
import { simSymbolAtom, simPricesAtom } from "@/store/atoms";
import { useSimPriceStream } from "@/hooks/useSimPriceStream";
import { useSimAccount } from "@/hooks/useSimAccount";
import SimOrderPanel from "./SimOrderPanel";
import SimPositions from "./SimPositions";
import SimOrders from "./SimOrders";
import SimTradeHistory from "./SimTradeHistory";
import SimOrderBook from "./SimOrderBook";
import SimMarketData from "./SimMarketData";

const CoinChart = dynamic(() => import("@/components/CoinChart"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[300px] bg-neutral-900 rounded-xl animate-pulse" />
    ),
});

function getCoinLogoUrl(symbol: string): string {
    const base = symbol.toUpperCase().replace(/USDT$/, "").toLowerCase();
    return `https://assets.coincap.io/assets/icons/${base}@2x.png`;
}

export default function SimTradingPage() {
    const simSymbol = useAtomValue(simSymbolAtom);
    const prices = useAtomValue(simPricesAtom);
    const [clickedPrice, setClickedPrice] = useState<number | null>(null);
    const [priceChange, setPriceChange] = useState(0);
    const prevPriceRef = useRef(0);
    const startPriceRef = useRef(0);

    useSimPriceStream();

    const currentPrice = prices[simSymbol] ?? 0;

    // 가격 변동률 추적 (세션 시작 기준)
    useEffect(() => {
        if (currentPrice > 0 && startPriceRef.current === 0) {
            startPriceRef.current = currentPrice;
        }
        if (startPriceRef.current > 0 && currentPrice > 0) {
            setPriceChange(((currentPrice - startPriceRef.current) / startPriceRef.current) * 100);
        }
        prevPriceRef.current = currentPrice;
    }, [currentPrice]);

    // 심볼 변경 시 리셋
    useEffect(() => {
        startPriceRef.current = 0;
        setPriceChange(0);
    }, [simSymbol]);

    const {
        userId,
        account,
        positions,
        orders,
        trades,
        loading,
        error,
        totalUnrealizedPnl,
        totalPositionMargin,
        openPosition,
        closePosition,
        cancelOrder,
        resetAccount,
        updateTpSl,
    } = useSimAccount();

    // 현재 심볼에 열린 포지션이 있으면 마진 모드 잠금
    const lockedMarginMode = positions.find(p => p.symbol === simSymbol)?.margin_mode ?? null;

    const handleOrderBookClick = (price: number) => {
        // 매번 새로운 참조를 만들어야 useEffect가 반응함
        setClickedPrice(price);
        // 바로 null로 리셋해서 같은 가격 재클릭도 동작
        setTimeout(() => setClickedPrice(null), 50);
    };

    return (
        <div className="flex flex-col gap-3 w-full min-w-[1320px] mx-auto mt-3">
            {/* 메인: 차트 + 호가창 + 주문 */}
            <div className="flex gap-3">
                {/* 좌측: 차트 + 포지션 */}
                <div className="flex-[3] flex flex-col gap-3 min-w-0">
                    {/* 코인 정보 바 */}
                    <div className="flex items-center gap-4 px-4 py-2.5 bg-neutral-950 rounded-xl border border-zinc-800">
                        <Image
                            src={getCoinLogoUrl(simSymbol)}
                            alt={simSymbol}
                            width={28}
                            height={28}
                            className="rounded-full"
                            unoptimized
                        />
                        <div className="flex items-center gap-1.5">
                            <span className="text-[15px] font-bold text-white">
                                {simSymbol.replace("USDT", "")}
                            </span>
                            <span className="text-[11px] text-neutral-500">/ USDT</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md ml-1">
                                Futures
                            </span>
                        </div>
                        <div className="flex items-baseline gap-2 ml-4">
                            <span className={`text-[18px] font-bold font-mono tabular-nums ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {currentPrice > 0 ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                            </span>
                            <span className={`text-xs font-semibold font-mono tabular-nums ${priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* 마켓 지표 */}
                    <SimMarketData />

                    <div className="flex gap-3 h-[calc(100vh-320px)]">
                        <div className="flex-1 min-w-0">
                            <CoinChart
                                boxId="sim-chart"
                                symbol={simSymbol}
                                interval="1m"
                                className="h-full"
                                hideControls
                                positions={positions}
                                onUpdateTpSl={updateTpSl}
                            />
                        </div>
                        <div className="w-[280px] flex-shrink-0">
                            <SimOrderBook onPriceClick={handleOrderBookClick} />
                        </div>
                    </div>

                    <SimPositions positions={positions} onClose={closePosition} onUpdateTpSl={updateTpSl} />
                    <SimOrders orders={orders} onCancel={cancelOrder} />
                    <SimTradeHistory trades={trades} />
                </div>

                {/* 우측: 주문 패널 */}
                <div className="w-[300px] flex-shrink-0">
                    <div className="sticky top-4">
                        <SimOrderPanel
                            account={account}
                            totalUnrealizedPnl={totalUnrealizedPnl}
                            totalPositionMargin={totalPositionMargin}
                            loading={loading}
                            error={error}
                            onSubmit={async (input) => { await openPosition(input); }}
                            onReset={resetAccount}
                            clickedPrice={clickedPrice}
                            lockedMarginMode={lockedMarginMode}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

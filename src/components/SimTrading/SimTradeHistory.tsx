"use client";

import type { SimTrade } from "@/types/sim-trading";

interface Props {
    trades: SimTrade[];
}

export default function SimTradeHistory({ trades }: Props) {
    if (trades.length === 0) {
        return (
            <div className="bg-neutral-950 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Trade History
                </h3>
                <div className="text-[11px] text-neutral-600 text-center py-6">
                    No trade history
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-950 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Trade History
                </h3>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-2 px-5 py-2 text-[10px] text-neutral-500 border-b border-zinc-800/40">
                <div>Symbol</div>
                <div className="text-right">Type</div>
                <div className="text-right">Price</div>
                <div className="text-right">Notional</div>
                <div className="text-right">PnL</div>
                <div className="text-right">Time</div>
            </div>

            {/* Trade list */}
            <div className="divide-y divide-zinc-800/30 max-h-60 overflow-y-auto">
                {trades.map((t) => {
                    const isLiq = t.type === "LIQUIDATION";
                    const isOpen = t.type === "OPEN";
                    const isProfit = t.pnl >= 0;
                    const isLong = t.side === "LONG";
                    const notional = t.quantity * t.price;
                    const date = new Date(t.created_at);
                    const timeStr = `${(date.getMonth() + 1)
                        .toString()
                        .padStart(2, "0")}/${date
                        .getDate()
                        .toString()
                        .padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date
                        .getMinutes()
                        .toString()
                        .padStart(2, "0")}`;

                    return (
                        <div
                            key={t.id}
                            className="grid grid-cols-[1fr_0.8fr_1fr_1fr_1fr_0.8fr] gap-2 items-center px-5 py-2.5 hover:bg-white/[0.015] transition-colors"
                        >
                            {/* Symbol */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`w-1 h-6 rounded-full ${
                                        isLiq ? "bg-orange-500" : isLong ? "bg-emerald-500" : "bg-red-500"
                                    }`}
                                />
                                <div>
                                    <span className="text-[12px] font-bold text-white">
                                        {t.symbol.replace("USDT", "")}
                                    </span>
                                    <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1.5 ${
                                            isLong ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                                        }`}
                                    >
                                        {t.side}
                                    </span>
                                </div>
                            </div>

                            {/* Type */}
                            <div className="text-right">
                                <span
                                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                        isLiq
                                            ? "bg-orange-500/15 text-orange-400"
                                            : isOpen
                                            ? "bg-blue-500/10 text-blue-400"
                                            : "bg-neutral-800 text-neutral-400"
                                    }`}
                                >
                                    {isLiq ? "Liquidation" : isOpen ? "Open" : "Close"}
                                </span>
                            </div>

                            {/* Price */}
                            <div className="text-right">
                                <div className="text-[12px] text-neutral-200 font-mono tabular-nums">
                                    {t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* Notional */}
                            <div className="text-right">
                                <div className="text-[12px] text-neutral-300 font-mono tabular-nums">
                                    ${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </div>
                            </div>

                            {/* PnL */}
                            <div className="text-right">
                                {isOpen ? (
                                    <span className="text-[11px] text-neutral-600">—</span>
                                ) : (
                                    <div
                                        className={`text-[12px] font-bold font-mono tabular-nums ${
                                            isLiq ? "text-orange-400" : isProfit ? "text-emerald-400" : "text-red-400"
                                        }`}
                                    >
                                        {isProfit && !isLiq ? "+" : ""}
                                        {t.pnl.toFixed(2)}
                                    </div>
                                )}
                            </div>

                            {/* Time */}
                            <div className="text-right">
                                <div className="text-[10px] text-neutral-500 font-mono tabular-nums">
                                    {timeStr}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

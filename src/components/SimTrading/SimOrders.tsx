"use client";

import type { SimOrder } from "@/types/sim-trading";

interface Props {
    orders: SimOrder[];
    onCancel: (orderId: string) => Promise<void>;
}

export default function SimOrders({ orders, onCancel }: Props) {
    if (orders.length === 0) {
        return (
            <div className="bg-neutral-950 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    Open Orders
                </h3>
                <div className="text-[11px] text-neutral-600 text-center py-6">
                    No open orders
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-950 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Open Orders
                    <span className="inline-flex items-center justify-center w-5 h-5 ml-2 text-[10px] font-bold bg-amber-500/15 text-amber-400 rounded-full">
                        {orders.length}
                    </span>
                </h3>
            </div>

            <div className="space-y-3 p-4">
                {orders.map((ord) => {
                    const isLong = ord.side === "LONG";
                    const notional = ord.quantity * ord.price;

                    return (
                        <div
                            key={ord.id}
                            className="rounded-2xl border border-zinc-800/70 bg-white/[0.02] p-4"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1 h-8 rounded-full ${isLong ? "bg-emerald-500" : "bg-red-500"}`} />
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[13px] font-bold text-white">
                                                {ord.symbol.replace("USDT", "")}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                isLong
                                                    ? "bg-emerald-500/15 text-emerald-400"
                                                    : "bg-red-500/15 text-red-400"
                                            }`}>
                                                {ord.side}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-amber-400 font-mono font-medium">{ord.leverage}x</span>
                                            <span className={`text-[9px] px-1 py-px rounded ${
                                                ord.margin_mode === "CROSS"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : "bg-violet-500/10 text-violet-400"
                                            }`}>
                                                {ord.margin_mode === "CROSS" ? "Cross" : "Isolated"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onCancel(ord.id)}
                                    className="text-[10px] px-3 py-1.5 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg border border-neutral-700/50 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-xl border border-zinc-800/70 bg-black/20 px-3 py-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Type</div>
                                    <div className="mt-1">
                                        <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-medium">
                                            {ord.order_type === "LIMIT" ? "Limit" : "Stop"}
                                        </span>
                                    </div>
                                </div>
                                <div className="rounded-xl border border-zinc-800/70 bg-black/20 px-3 py-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Price</div>
                                    <div className="mt-1 text-[12px] text-neutral-200 font-mono tabular-nums">
                                        {ord.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-zinc-800/70 bg-black/20 px-3 py-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Quantity</div>
                                    <div className="mt-1 text-[12px] text-neutral-300 font-mono tabular-nums">
                                        {ord.quantity.toFixed(6)}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-zinc-800/70 bg-black/20 px-3 py-2.5">
                                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Notional</div>
                                    <div className="mt-1 text-[12px] text-neutral-200 font-mono tabular-nums">
                                        ${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

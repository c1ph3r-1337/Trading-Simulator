"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { simPricesAtom } from "@/store/atoms";
import { calcRoe } from "@/lib/sim-trading";
import type { SimPosition } from "@/types/sim-trading";

interface Props {
    positions: SimPosition[];
    onClose: (positionId: string, closePrice: number) => Promise<unknown>;
    onUpdateTpSl?: (positionId: string, tp: number | null, sl: number | null) => Promise<void>;
}

export default function SimPositions({ positions, onClose, onUpdateTpSl }: Props) {
    const prices = useAtomValue(simPricesAtom);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTp, setEditTp] = useState("");
    const [editSl, setEditSl] = useState("");
    const [tpSlError, setTpSlError] = useState("");

    if (positions.length === 0) {
        return (
            <div className="bg-neutral-950 rounded-2xl border border-zinc-800 p-5">
                <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Positions</h3>
                <div className="text-[11px] text-neutral-600 text-center py-6">
                    No open positions
                </div>
            </div>
        );
    }

    return (
        <div className="bg-neutral-950 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                <h3 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Positions
                    <span className="inline-flex items-center justify-center w-5 h-5 ml-2 text-[10px] font-bold bg-amber-500/15 text-amber-400 rounded-full">
                        {positions.length}
                    </span>
                </h3>
            </div>

            {/* 테이블 헤더 */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-5 py-2 text-[10px] text-neutral-500 border-b border-zinc-800/40">
                <div>Symbol</div>
                <div className="text-right">Size</div>
                <div className="text-right">Entry</div>
                <div className="text-right">Mark</div>
                <div className="text-right">Liq.</div>
                <div className="text-right">Unrealized PnL</div>
                <div className="text-right w-[52px]"></div>
            </div>

            {/* 포지션 리스트 */}
            <div className="divide-y divide-zinc-800/30">
                {positions.map((pos) => {
                    const cp = prices[pos.symbol] ?? pos.entry_price;
                    const pnl = pos.unrealized_pnl;
                    const roe = calcRoe(pnl, pos.margin);
                    const isProfit = pnl >= 0;
                    const isLong = pos.side === "LONG";
                    const notional = pos.quantity * cp;
                    const liqDist = pos.entry_price > 0
                        ? Math.abs(cp - pos.liq_price) / cp * 100
                        : 0;

                    return (
                        <div key={pos.id} className="group">
                            {/* 메인 행 */}
                            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center px-5 py-3 hover:bg-white/[0.015] transition-colors">
                                {/* 심볼 + 방향 */}
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-8 rounded-full ${isLong ? "bg-emerald-500" : "bg-red-500"}`} />
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[13px] font-bold text-white">
                                                {pos.symbol.replace("USDT", "")}
                                            </span>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                isLong
                                                    ? "bg-emerald-500/15 text-emerald-400"
                                                    : "bg-red-500/15 text-red-400"
                                            }`}>
                                                {pos.side}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-amber-400 font-mono font-medium">{Number(pos.leverage).toFixed(0)}x</span>
                                            <span className={`text-[9px] px-1 py-px rounded ${
                                                pos.margin_mode === "CROSS"
                                                    ? "bg-amber-500/10 text-amber-400"
                                                    : "bg-violet-500/10 text-violet-400"
                                            }`}>
                                                {pos.margin_mode === "CROSS" ? "Cross" : "Isolated"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 규모 */}
                                <div className="text-right">
                                    <div className="text-[12px] text-neutral-200 font-mono tabular-nums">
                                        ${notional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-[10px] text-neutral-500 font-mono tabular-nums">
                                        {pos.margin.toFixed(2)} margin
                                    </div>
                                </div>

                                {/* 진입가 */}
                                <div className="text-right">
                                    <div className="text-[12px] text-neutral-300 font-mono tabular-nums">
                                        {pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                {/* 현재가 */}
                                <div className="text-right">
                                    <div className={`text-[12px] font-mono tabular-nums font-medium ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                        {cp.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                </div>

                                {/* 청산가 */}
                                <div className="text-right">
                                    <div className="text-[12px] text-orange-400 font-mono tabular-nums">
                                        {pos.liq_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    </div>
                                    <div className={`text-[10px] font-mono tabular-nums ${liqDist < 5 ? "text-orange-400" : "text-neutral-500"}`}>
                                        {liqDist.toFixed(1)}% away
                                    </div>
                                </div>

                                {/* PnL */}
                                <div className="text-right">
                                    <div className={`text-[14px] font-bold font-mono tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                        {isProfit ? "+" : ""}{pnl.toFixed(2)}
                                    </div>
                                    <div className={`text-[11px] font-mono tabular-nums ${isProfit ? "text-emerald-500" : "text-red-500"}`}>
                                        {isProfit ? "+" : ""}{roe.toFixed(2)}%
                                    </div>
                                </div>

                                {/* 청산 버튼 */}
                                <div className="text-right w-[52px]">
                                    <button
                                        onClick={() => onClose(pos.id, cp)}
                                        className="text-[10px] px-3 py-1.5 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg border border-neutral-700/50 transition-all cursor-pointer"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* TP/SL 바 */}
                            <div className="px-5 pb-2.5">
                                {editingId === pos.id ? (
                                    <div className="flex items-center gap-2 bg-neutral-900/50 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <span className="text-[10px] text-emerald-400 font-medium shrink-0">TP</span>
                                            <input
                                                type="number"
                                                value={editTp}
                                                onChange={(e) => setEditTp(e.target.value)}
                                                placeholder="Not set"
                                                className="w-full bg-neutral-800 text-emerald-400 text-[11px] font-mono rounded-md px-2 py-1.5 border border-neutral-700/50 outline-none placeholder:text-neutral-600 focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-1">
                                            <span className="text-[10px] text-red-400 font-medium shrink-0">SL</span>
                                            <input
                                                type="number"
                                                value={editSl}
                                                onChange={(e) => setEditSl(e.target.value)}
                                                placeholder="Not set"
                                                className="w-full bg-neutral-800 text-red-400 text-[11px] font-mono rounded-md px-2 py-1.5 border border-neutral-700/50 outline-none placeholder:text-neutral-600 focus:border-red-500"
                                            />
                                        </div>
                                        <button
                                            onClick={async () => {
                                                setTpSlError("");
                                                const tp = editTp ? parseFloat(editTp) : null;
                                                const sl = editSl ? parseFloat(editSl) : null;
                                                try {
                                                    await onUpdateTpSl?.(pos.id, tp, sl);
                                                    setEditingId(null);
                                                } catch (e) {
                                                    setTpSlError(e instanceof Error ? e.message : "Failed to update TP/SL");
                                                }
                                            }}
                                            className="text-[10px] px-3 py-1.5 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 hover:bg-amber-500/30 transition-colors cursor-pointer shrink-0 font-medium"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => { setEditingId(null); setTpSlError(""); }}
                                            className="text-[10px] px-2 py-1.5 text-neutral-500 hover:text-neutral-300 cursor-pointer shrink-0"
                                        >
                                            Cancel
                                        </button>
                                        {tpSlError && (
                                            <span className="text-[10px] text-red-500 shrink-0">{tpSlError}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 text-[11px]">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-neutral-500">TP</span>
                                            {pos.tp_price ? (
                                                <span className="text-emerald-400 font-mono font-medium">
                                                    {pos.tp_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-600">---</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-neutral-500">SL</span>
                                            {pos.sl_price ? (
                                                <span className="text-red-400 font-mono font-medium">
                                                    {pos.sl_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </span>
                                            ) : (
                                                <span className="text-neutral-600">---</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingId(pos.id);
                                                setEditTp(pos.tp_price ? String(pos.tp_price) : "");
                                                setEditSl(pos.sl_price ? String(pos.sl_price) : "");
                                                setTpSlError("");
                                            }}
                                            className="text-[10px] px-2.5 py-1 font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 rounded-md transition-colors cursor-pointer ml-auto"
                                        >
                                            Edit TP/SL
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

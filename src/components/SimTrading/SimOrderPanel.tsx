"use client";

import { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { simSymbolAtom, simPricesAtom, simMarginModeAtom } from "@/store/atoms";
import { SUPPORTED_SYMBOLS } from "@/hooks/useSimPriceStream";
import { calcLiqPrice, calcLiqPriceCross } from "@/lib/sim-trading";
import type { SimAccount, OpenPositionInput, PositionSide, OrderType, MarginMode } from "@/types/sim-trading";

interface Props {
    account: SimAccount | null;
    totalUnrealizedPnl: number;
    totalPositionMargin: number;
    loading: boolean;
    error: string | null;
    onSubmit: (input: OpenPositionInput) => Promise<void>;
    onReset: () => void;
    /** 호가창에서 클릭된 가격 */
    clickedPrice: number | null;
    /** 현재 심볼에 열린 포지션의 마진 모드 (있으면 변경 불가) */
    lockedMarginMode: MarginMode | null;
}

const LEVERAGE_PRESETS = [1, 2, 5, 10, 20, 50, 75, 100, 125];

export default function SimOrderPanel({ account, totalUnrealizedPnl, totalPositionMargin, loading, error, onSubmit, onReset, clickedPrice, lockedMarginMode }: Props) {
    const [simSymbol, setSimSymbol] = useAtom(simSymbolAtom);
    const prices = useAtomValue(simPricesAtom);
    const [marginMode, setMarginMode] = useAtom(simMarginModeAtom);
    const currentPrice = prices[simSymbol] ?? 0;

    const [side, setSide] = useState<PositionSide>("LONG");
    const [orderType, setOrderType] = useState<OrderType>("MARKET");
    const [leverage, setLeverage] = useState(10);
    const [amountUsdt, setAmountUsdt] = useState("");
    const [limitPrice, setLimitPrice] = useState("");
    const [tpPrice, setTpPrice] = useState("");
    const [slPrice, setSlPrice] = useState("");
    const [showTpSl, setShowTpSl] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    // 기존 포지션의 마진 모드로 강제 동기화
    useEffect(() => {
        if (lockedMarginMode) {
            setMarginMode(lockedMarginMode);
        }
    }, [lockedMarginMode, setMarginMode]);

    // 호가창 클릭 시 지정가로 전환 + 가격 입력
    useEffect(() => {
        if (clickedPrice !== null && clickedPrice > 0) {
            setOrderType("LIMIT");
            setLimitPrice(String(clickedPrice));
        }
    }, [clickedPrice]);

    const accountReady = !!account;
    const balance = account?.balance ?? 0;
    // 자산 = 가용잔고 + 포지션 증거금 + 미실현 PnL
    const equity = balance + totalPositionMargin + totalUnrealizedPnl;
    const totalDeposit = account?.total_deposit ?? 10000;
    const totalPnl = equity - totalDeposit;
    const roe = totalDeposit > 0 ? (totalPnl / totalDeposit) * 100 : 0;

    const price = orderType === "MARKET" ? currentPrice : parseFloat(limitPrice) || 0;
    const amount = parseFloat(amountUsdt) || 0;
    const margin = leverage > 0 ? amount / leverage : 0;
    const coinQty = price > 0 ? amount / price : 0;
    const estLiqPrice = (() => {
        if (price <= 0 || leverage <= 0) return 0;
        if (marginMode === "CROSS") {
            const availBal = Math.max(0, balance - margin - amount * 0.0004);
            return calcLiqPriceCross(side, price, coinQty, margin, availBal);
        }
        return calcLiqPrice(side, price, leverage);
    })();

    const handlePercentage = (pct: number) => {
        const maxUsdt = balance * leverage;
        setAmountUsdt((maxUsdt * pct).toFixed(2));
    };

    const handleSubmit = async () => {
        setFormError("");
        if (!currentPrice) { setFormError("Loading price data"); return; }
        if (amount <= 0) { setFormError("Enter an order amount"); return; }
        if (orderType !== "MARKET" && (!limitPrice || parseFloat(limitPrice) <= 0)) { setFormError("Enter a limit price"); return; }
        if (margin > balance) { setFormError("Insufficient balance"); return; }

        // TP/SL 유효성 검증
        const tp = tpPrice ? parseFloat(tpPrice) : null;
        const sl = slPrice ? parseFloat(slPrice) : null;
        if (side === "LONG") {
            if (tp !== null && tp <= price) { setFormError("Long TP must be above entry price"); return; }
            if (sl !== null && sl >= price) { setFormError("Long SL must be below entry price"); return; }
        } else {
            if (tp !== null && tp >= price) { setFormError("Short TP must be below entry price"); return; }
            if (sl !== null && sl <= price) { setFormError("Short SL must be above entry price"); return; }
        }

        setSubmitting(true);
        try {
            await onSubmit({ symbol: simSymbol, side, orderType, price, quantityUsdt: amount, leverage, tpPrice: tpPrice ? parseFloat(tpPrice) : undefined, slPrice: slPrice ? parseFloat(slPrice) : undefined, marginMode });
            setAmountUsdt("");
            setLimitPrice("");
            setTpPrice("");
            setSlPrice("");
            setFormError("");
        } catch (e: unknown) {
            setFormError(e instanceof Error ? e.message : "Order failed");
        }
        setSubmitting(false);
    };

    return (
        <div className="bg-neutral-950 rounded-2xl border border-zinc-800 flex flex-col gap-0 overflow-hidden">
            {/* 잔고 섹션 */}
            <div className="px-4 pt-4 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Demo Account</span>
                    <button disabled={!accountReady} onClick={onReset} className="text-[9px] px-2 py-0.5 text-neutral-500 hover:text-amber-300 border border-neutral-700/50 hover:border-amber-500/30 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                        Reset
                    </button>
                </div>
                {/* 총 자산 */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-[18px] font-bold text-white font-mono tabular-nums">
                            {loading || !accountReady ? "—" : `${equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">Total Equity (USDT)</div>
                    </div>
                    <div className="text-right">
                        <div className={`text-xs font-bold tabular-nums ${roe >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {loading || !accountReady ? "—" : `${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%`}
                        </div>
                        <div className={`text-[10px] tabular-nums ${totalUnrealizedPnl >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>
                            {loading || !accountReady ? "" : `${totalUnrealizedPnl >= 0 ? "+" : ""}${totalUnrealizedPnl.toFixed(2)} PnL`}
                        </div>
                    </div>
                </div>
                {/* 가용잔고 / 증거금 분리 */}
                {!loading && accountReady && (
                    <div className="flex gap-3 mt-2 pt-2 border-t border-zinc-800/40">
                        <div className="flex-1">
                            <div className="text-[9px] text-neutral-600 mb-0.5">Available Balance</div>
                            <div className="text-[12px] text-neutral-200 font-mono tabular-nums">
                                {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] text-neutral-600 mb-0.5">Used Margin</div>
                            <div className="text-[12px] text-amber-400/80 font-mono tabular-nums">
                                {totalPositionMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="text-[9px] text-neutral-600 mb-0.5">Unrealized PnL</div>
                            <div className={`text-[12px] font-mono tabular-nums ${totalUnrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {totalUnrealizedPnl >= 0 ? "+" : ""}{totalUnrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                )}
                {!loading && error && (
                    <div className="mt-2 text-[10px] text-red-400 break-words">
                        {error}
                    </div>
                )}
            </div>

            {/* 주문 섹션 */}
            <div className="px-4 py-3 flex flex-col gap-2.5">
                {/* 심볼 */}
                <select
                    value={simSymbol}
                    onChange={(e) => setSimSymbol(e.target.value)}
                    disabled={!accountReady}
                    className="w-full bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 border border-zinc-800 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
                >
                    {SUPPORTED_SYMBOLS.map((s) => (
                        <option key={s} value={s}>{s.replace("USDT", " / USDT")}</option>
                    ))}
                </select>

                {/* 롱/숏 */}
                <div className="grid grid-cols-2 gap-0 bg-neutral-900 rounded-lg overflow-hidden border border-zinc-800">
                    <button
                        onClick={() => setSide("LONG")}
                        disabled={!accountReady}
                        className={`py-2 text-xs font-bold transition-colors cursor-pointer ${
                            side === "LONG"
                                ? "bg-emerald-600 text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                        }`}
                    >
                        Long
                    </button>
                    <button
                        onClick={() => setSide("SHORT")}
                        disabled={!accountReady}
                        className={`py-2 text-xs font-bold transition-colors cursor-pointer ${
                            side === "SHORT"
                                ? "bg-red-600 text-white"
                                : "text-neutral-500 hover:text-neutral-300"
                        }`}
                    >
                        Short
                    </button>
                </div>

                {/* 주문 타입 */}
                <div className="flex gap-1.5">
                    {(["MARKET", "LIMIT"] as OrderType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setOrderType(t)}
                            disabled={!accountReady}
                            className={`flex-1 py-1.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                                orderType === t
                                    ? "bg-neutral-800 text-white border border-zinc-700"
                                    : "text-neutral-500 border border-transparent hover:text-neutral-300"
                            }`}
                        >
                            {t === "MARKET" ? "Market" : "Limit"}
                        </button>
                    ))}
                </div>

                {/* 지정가 */}
                {orderType === "LIMIT" && (
                    <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        disabled={!accountReady}
                        placeholder={`Limit price — ${currentPrice || ""}`}
                        className="w-full bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 border border-zinc-800 outline-none placeholder:text-neutral-600 focus:border-zinc-600 transition-colors"
                    />
                )}

                {/* 마진 모드 */}
                <div className="relative">
                    <div className="grid grid-cols-2 gap-0 bg-neutral-900 rounded-lg overflow-hidden border border-zinc-800">
                        {(["CROSS", "ISOLATED"] as MarginMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => !lockedMarginMode && setMarginMode(mode)}
                                disabled={!accountReady || !!lockedMarginMode}
                                className={`py-1.5 text-[10px] font-bold transition-colors ${
                                    lockedMarginMode ? "cursor-not-allowed" : "cursor-pointer"
                                } ${
                                    marginMode === mode
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "text-neutral-500 hover:text-neutral-300"
                                } ${lockedMarginMode ? "opacity-60" : ""}`}
                            >
                                {mode === "CROSS" ? "Cross" : "Isolated"}
                            </button>
                        ))}
                    </div>
                    {lockedMarginMode && (
                        <div className="text-[9px] text-neutral-600 mt-1">
                            Margin mode is locked while a position is open
                        </div>
                    )}
                </div>

                {/* 레버리지 */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-neutral-500">Leverage</span>
                        <span className="text-xs font-bold text-amber-400 font-mono">{leverage}x</span>
                    </div>
                    <input type="range" min={1} max={125} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} disabled={!accountReady} className="w-full accent-amber-500 h-1" />
                    <div className="flex gap-0.5 mt-1.5">
                        {LEVERAGE_PRESETS.map((l) => (
                            <button
                                key={l}
                                onClick={() => setLeverage(l)}
                                disabled={!accountReady}
                                className={`flex-1 py-0.5 text-[9px] rounded transition-colors cursor-pointer ${
                                    leverage === l
                                        ? "bg-amber-500/20 text-amber-300 font-medium"
                                        : "bg-neutral-900 text-neutral-600 hover:text-neutral-400"
                                }`}
                            >
                                {l}x
                            </button>
                        ))}
                    </div>
                </div>

                {/* 수량 */}
                <div>
                    <input
                        type="number"
                        value={amountUsdt}
                        onChange={(e) => setAmountUsdt(e.target.value)}
                        disabled={!accountReady}
                        placeholder="Order amount (USDT)"
                        className="w-full bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 border border-zinc-800 outline-none placeholder:text-neutral-600 focus:border-zinc-600 transition-colors"
                    />
                    <div className="flex gap-0.5 mt-1.5">
                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                            <button
                                key={pct}
                                onClick={() => handlePercentage(pct)}
                                disabled={!accountReady}
                                className="flex-1 py-1 text-[9px] bg-neutral-900 text-neutral-500 rounded hover:text-neutral-300 border border-zinc-800/50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {pct * 100}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* TP/SL */}
                <button
                    onClick={() => setShowTpSl(!showTpSl)}
                    disabled={!accountReady}
                    className="text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {showTpSl ? "▾" : "▸"} TP / SL
                </button>
                {showTpSl && (
                    <div className="flex gap-2">
                        <input type="number" value={tpPrice} onChange={(e) => setTpPrice(e.target.value)} disabled={!accountReady} placeholder="Take Profit" className="flex-1 bg-neutral-900 text-white text-[10px] rounded-lg px-2 py-1.5 border border-zinc-800 outline-none placeholder:text-neutral-600" />
                        <input type="number" value={slPrice} onChange={(e) => setSlPrice(e.target.value)} disabled={!accountReady} placeholder="Stop Loss" className="flex-1 bg-neutral-900 text-white text-[10px] rounded-lg px-2 py-1.5 border border-zinc-800 outline-none placeholder:text-neutral-600" />
                    </div>
                )}

                {/* 주문 정보 */}
                <div className="text-[10px] text-neutral-600 space-y-0.5 pt-1 border-t border-zinc-800/40">
                    <div className="flex justify-between"><span>Margin</span><span className="text-neutral-400">{margin.toFixed(2)} USDT</span></div>
                    <div className="flex justify-between"><span>Quantity</span><span className="text-neutral-400">{coinQty.toFixed(6)} {simSymbol.replace("USDT", "")}</span></div>
                    <div className="flex justify-between"><span>Liquidation</span><span className="text-orange-400/80">{estLiqPrice > 0 ? `$${estLiqPrice.toFixed(2)}` : "—"}</span></div>
                    <div className="flex justify-between"><span>Fee</span><span className="text-neutral-400">{(amount * 0.0004).toFixed(2)} USDT</span></div>
                </div>

                {formError && <div className="text-[10px] text-red-400 text-center">{formError}</div>}

                {/* 주문 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !currentPrice || !accountReady}
                    className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        side === "LONG"
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-red-600 hover:bg-red-500 text-white"
                    }`}
                >
                    {submitting ? "..." : side === "LONG" ? `Buy / Long` : `Sell / Short`}
                </button>
            </div>
        </div>
    );
}

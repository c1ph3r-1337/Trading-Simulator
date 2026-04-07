"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { useVisibilityPolling } from "@/hooks/useVisibilityPolling";
import { treemapOpenAtom } from "@/store/atoms";

type FxRateData = {
    base: string;
    quote: string;
    rate: number | null;
    date: string | null;
    provider: string;
    degraded: boolean;
};

async function fetchFxRate(
    base: string,
    quote: string,
    signal?: AbortSignal
): Promise<FxRateData> {
    const res = await fetch(
        `/api/fx-rate?base=${encodeURIComponent(base)}&quote=${encodeURIComponent(quote)}`,
        {
            cache: "no-store",
            signal,
        }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<FxRateData>;
}

export default function FxRateWidget({
    base = "USD",
    quote = "INR",
    pollMs = 60_000,
    fadeDelay = 0,
    className = "",
}: {
    base?: string;
    quote?: string;
    pollMs?: number;
    fadeDelay?: number;
    className?: string;
}) {
    const [data, setData] = useState<FxRateData | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const isTreemapOpen = useAtomValue(treemapOpenAtom);

    const load = useCallback(async () => {
        try {
            abortRef.current?.abort();
            const ctrl = new AbortController();
            abortRef.current = ctrl;
            const next = await fetchFxRate(base, quote, ctrl.signal);
            if (ctrl.signal.aborted) return;
            setData(next);
        } catch {
            // keep the last successful value
        }
    }, [base, quote]);

    useVisibilityPolling({
        interval: pollMs,
        onPoll: load,
        immediate: true,
        enabled: !isTreemapOpen,
    });

    const isLoading = data == null;
    const rate = data?.rate ?? null;
    const hundredInr = rate != null && rate > 0 ? 100 / rate : null;

    return (
        <div
            className={`relative flex h-full min-w-0 flex-col rounded-[28px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.14),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 2xl:p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div
                className={`flex h-full flex-col transition-[opacity,transform] duration-700 ${
                    isLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                }`}
                style={{
                    transitionDelay: `${fadeDelay}ms`,
                    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                            Rupee Watch
                        </div>
                        <h3 className="mt-2 text-xl 2xl:text-2xl font-semibold">USD / INR</h3>
                        <p className="mt-2 max-w-[24rem] text-sm leading-6 text-zinc-400">
                            Daily reference rate for the dollar against the rupee, kept front and
                            center for India-based pricing context.
                        </p>
                    </div>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] 2xl:text-xs font-semibold text-amber-300">
                        FX
                    </span>
                </div>

                <div className="mt-7 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[24px] border border-white/6 bg-white/[0.03] p-5">
                        <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                            Spot Reference
                        </div>
                        <div className="mt-4 text-4xl 2xl:text-5xl font-bold tracking-tight text-amber-300">
                            {rate != null
                                ? rate.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 4,
                                  })
                                : "—"}
                        </div>
                        <div className="mt-2 text-sm text-zinc-400">
                            Indian rupees for one US dollar
                        </div>
                        <div className="mt-5 flex items-center gap-2 text-xs text-amber-200/80">
                            <span className="inline-flex h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.8)]" />
                            Used across the dashboard for INR-normalized pricing
                        </div>
                    </div>

                    <div className="grid gap-3">
                        <div className="rounded-[22px] border border-emerald-500/15 bg-emerald-500/8 p-4">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/75">
                                Dollar to Rupee
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-emerald-300 font-mono tabular-nums">
                                {rate != null
                                    ? `${rate.toLocaleString("en-IN", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 4,
                                      })} INR`
                                    : "—"}
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">1 USD conversion</div>
                        </div>

                        <div className="rounded-[22px] border border-sky-500/15 bg-sky-500/8 p-4">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-sky-400/75">
                                Rupee to Dollar
                            </div>
                            <div className="mt-3 text-2xl font-semibold text-sky-300 font-mono tabular-nums">
                                {hundredInr != null
                                    ? `${hundredInr.toLocaleString("en-US", {
                                          minimumFractionDigits: 4,
                                          maximumFractionDigits: 4,
                                      })} USD`
                                    : "—"}
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">100 INR conversion</div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto grid gap-3 pt-5 text-sm xl:grid-cols-[1fr_auto]">
                    <div className="rounded-[20px] border border-white/6 bg-black/20 px-4 py-3">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                            Market Note
                        </div>
                        <div className="mt-2 text-zinc-300">
                            Higher USD/INR generally means imported dollar-priced assets feel more
                            expensive in rupee terms.
                        </div>
                    </div>
                    <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3 text-right">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                            Updated
                        </div>
                        <div className="mt-2 font-mono text-base text-zinc-100">
                            {data?.date ?? "—"}
                        </div>
                        <div className="mt-1 text-xs text-zinc-500">{data?.provider ?? "—"}</div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.18 }}
                        className="absolute left-1/2 top-[calc(100%+16px)] z-50 w-[235px] -translate-x-1/2 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-4 text-[11px] text-neutral-300 shadow-lg pointer-events-none"
                    >
                        <div className="mb-1 font-semibold text-amber-300">
                            About this metric
                        </div>
                        <p className="leading-snug">
                            Tracks the daily USD/INR reference rate.
                            <br />
                            Useful for reading rupee strength,
                            <br />
                            import cost pressure, and currency context
                            <br />
                            for global assets priced in dollars.
                        </p>
                        <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 -translate-y-[9px] border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                        <div className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 -translate-y-[7px] border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

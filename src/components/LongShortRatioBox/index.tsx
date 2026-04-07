"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtomValue } from "jotai";
import { treemapOpenAtom } from "@/store/atoms";

type Period = "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "12h" | "1d";
type Source = "global" | "top-trader" | "taker";

type Props = {
  symbol?: string;      // ex) "BTCUSDT"
  period?: Period;
  source?: Source;
  pollMs?: number;      // 폴링 주기(ms) 기본 60초
  className?: string;
};

type RatioRow = {
  symbol: string;
  longShortRatio: string;
  longAccount?: string;
  shortAccount?: string;
  longShortRatioBuy?: string;   // taker 전용
  longShortRatioSell?: string;  // taker 전용
  timestamp: number;            // ms
};

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

function isRatioRowArray(x: unknown): x is RatioRow[] {
  return Array.isArray(x) &&
    x.every((r) => r && typeof r === "object" && typeof (r as { timestamp?: unknown }).timestamp === "number");
}

// Tooltip copy (HTML line breaks preserved)
const DESCRIPTION_MAP: Record<Source, string> = {
  global:
    "Long/short ratio across all Binance accounts<br/>Useful for reading overall market positioning.",
  "top-trader":
    "Long/short ratio for Binance top traders<br/>Useful for tracking the bias of higher-skill traders.",
  taker:
    "Taker buy/sell ratio at market price<br/>Reflects aggressive order flow in real time.",
};

export default function LongShortRatioBox({
  symbol = "BTCUSDT",
  period = "5m",
  source = "global",
  pollMs = 60_000,
  className = "",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [longPct, setLongPct] = useState<number | null>(null);
  const [shortPct, setShortPct] = useState<number | null>(null);
  const [ts, setTs] = useState<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isTreemapOpen = useAtomValue(treemapOpenAtom);

  const endpoint = useMemo(() => {
    switch (source) {
      case "global":
        return "https://fapi.binance.com/futures/data/globalLongShortAccountRatio";
      case "top-trader":
        return "https://fapi.binance.com/futures/data/topLongShortPositionRatio";
      case "taker":
        return "https://fapi.binance.com/futures/data/takerlongshortRatio";
      default:
        return "";
    }
  }, [source]);

  async function fetchRatio() {
    try {
      setErr(null);
      const url = `${endpoint}?symbol=${symbol}&period=${period}&limit=30`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json: unknown = await res.json();
      if (!isRatioRowArray(json) || json.length === 0) throw new Error("empty");

      const latest = json[json.length - 1];
      setTs(latest.timestamp);

      if (source === "taker") {
        const buy = Number.parseFloat(latest.longShortRatioBuy ?? "0");
        const long = Number.isFinite(buy) ? (buy / (buy + 1)) * 100 : NaN;
        const short = 100 - long;
        setLongPct(Number.isFinite(long) ? long : null);
        setShortPct(Number.isFinite(short) ? short : null);
      } else {
        const lsr = Number.parseFloat(latest.longShortRatio);
        if (!Number.isFinite(lsr)) throw new Error("invalid longShortRatio");
        const long = (lsr / (1 + lsr)) * 100;
        const short = 100 - long;
        setLongPct(long);
        setShortPct(short);
      }

      setLoading(false);
    } catch (e) {
      setErr(toErrorMessage(e));
      setLoading(false);
    }
  }

  useEffect(() => {
    // 트리맵 열려있으면 폴링 중단
    if (isTreemapOpen) return;

    setLoading(true);
    void fetchRatio();
    if (pollMs > 0) {
      const t = setInterval(() => { void fetchRatio(); }, pollMs);
      return () => clearInterval(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, period, source, pollMs, isTreemapOpen]);

  const description = DESCRIPTION_MAP[source];
  const sourceLabel =
    source === "global" ? "Global" : source === "top-trader" ? "Top Trader" : "Taker";
  const dominantLong = (longPct ?? 0) >= (shortPct ?? 0);
  const tilt = longPct == null || shortPct == null
    ? "Balanced"
    : Math.abs(longPct - shortPct) < 2
      ? "Balanced"
      : dominantLong
        ? "Long Bias"
        : "Short Bias";
  const accentClass =
    tilt === "Balanced"
      ? "text-amber-300 border-amber-500/20 bg-amber-500/10"
      : dominantLong
        ? "text-emerald-300 border-emerald-500/20 bg-emerald-500/10"
        : "text-red-300 border-red-500/20 bg-red-500/10";
  const labelCopy =
    source === "global"
      ? "All-account positioning snapshot"
      : source === "top-trader"
        ? "Top account positioning snapshot"
        : "Aggressive taker flow snapshot";

  return (
    <div
      className={`relative flex h-full min-w-0 flex-col rounded-[28px] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 2xl:p-6 shadow-[0_18px_60px_rgba(0,0,0,0.28)] cursor-default text-white ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            Positioning
          </div>
          <div className="mt-2 font-semibold text-xl 2xl:text-2xl text-neutral-100">
            {symbol}
          </div>
          <p className="mt-2 max-w-[22rem] text-sm leading-6 text-neutral-400">
            {labelCopy}
          </p>
        </div>
        <div className="rounded-full border border-white/6 bg-white/6 px-2.5 py-1 text-[10px] 2xl:text-xs font-semibold text-neutral-300 whitespace-nowrap">
          {sourceLabel} · {period}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 h-40 rounded-[24px] bg-neutral-800 animate-pulse" />
      ) : err ? (
        <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4 text-sm text-amber-400">⚠ {err}</div>
      ) : (
        <>
          <div className="mt-7 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Bias Signal
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${accentClass}`}>
                  {tilt}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Snapshot
              </div>
              <div className="mt-2 text-sm font-medium text-neutral-200 whitespace-nowrap">
                {ts ? new Date(ts).toLocaleString("en-IN") : "—"}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/6 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              <span>Position Split</span>
              <span>{sourceLabel}</span>
            </div>
            <div className="mt-4 relative h-12 w-full overflow-hidden rounded-full border border-white/5 bg-neutral-800/70">
              <div className="absolute inset-0 bg-red-500/80" />
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, longPct ?? 0))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[20px] border border-emerald-500/15 bg-emerald-500/8 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-400/75">
                  Long
                </div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300 tabular-nums">
                  {longPct?.toFixed(2)}%
                </div>
                <div className="mt-1 text-xs text-zinc-400">Bullish positioning share</div>
              </div>
              <div className="rounded-[20px] border border-red-500/15 bg-red-500/8 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-red-400/75">
                  Short
                </div>
                <div className="mt-2 text-2xl font-semibold text-red-300 tabular-nums">
                  {shortPct?.toFixed(2)}%
                </div>
                <div className="mt-1 text-xs text-zinc-400">Bearish positioning share</div>
              </div>
            </div>
          </div>

          <div className="mt-auto grid gap-3 pt-5 xl:grid-cols-[1fr_auto]">
            <div className="rounded-[20px] border border-white/6 bg-black/20 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Reading
              </div>
              <div className="mt-2 text-sm text-neutral-300">
                {tilt === "Balanced"
                  ? "Long and short positioning is close to even, so conviction is muted."
                  : dominantLong
                    ? "Longs are leading the book, showing stronger bullish positioning."
                    : "Shorts are leading the book, showing stronger bearish positioning."}
              </div>
            </div>
            <div className="rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3 text-right">
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                Spread
              </div>
              <div className={`mt-2 text-xl font-semibold tabular-nums ${dominantLong ? "text-emerald-300" : "text-red-300"}`}>
                {longPct != null && shortPct != null
                  ? `${Math.abs(longPct - shortPct).toFixed(2)}%`
                  : "—"}
              </div>
              <div className="mt-1 text-xs text-neutral-500">Gap between both sides</div>
            </div>
          </div>
        </>
      )}

      {/* Custom tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] w-[220px] 2xl:w-[260px] text-[11px] 2xl:text-xs bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-lg py-3 px-4 2xl:py-4 2xl:px-5 shadow-lg z-50 pointer-events-none"
          >
            <div className="font-semibold text-amber-300 mb-1 2xl:mb-2">
              Indicator Info ({sourceLabel})
            </div>
            <p
              className="leading-snug"
              dangerouslySetInnerHTML={{ __html: description }}
            />
            {/* 위쪽 화살표 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

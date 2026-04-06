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

// 툴팁 설명 (HTML 줄바꿈 포함)
const DESCRIPTION_MAP: Record<Source, string> = {
  global:
    "바이낸스 모든 계정의 롱/숏 비율<br/>시장 전체의 포지션 성향을 파악할 때 사용합니다.",
  "top-trader":
    "바이낸스 상위 10% 트레이더 롱/숏 비율<br/>숙련된 트레이더들의 방향성을 참고합니다.",
  taker:
    "테이커(시장가) 매수/매도 비율<br/>즉각적인 공격적 주문 흐름을 반영합니다.",
};

export default function LongShortRatioBox({
  symbol = "BTCUSDT",
  period = "5m",
  source = "global",
  pollMs = 60_000,
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

  return (
    <div
      className="relative flex-1 min-w-0 min-h-30 2xl:min-h-45 border border-neutral-800 rounded-lg shadow-sm p-2 2xl:p-4 cursor-default bg-neutral-900 flex flex-col justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-1 2xl:mb-2">
        <div className="font-semibold text-sm 2xl:text-base text-neutral-100">{symbol}</div>
        <div className="text-[11px] 2xl:text-xs text-neutral-300">
          {source === "global" && "Global"}
          {source === "top-trader" && "Top Trader"}
          {source === "taker" && "Taker"}
          {" · "}
          {period}
        </div>
      </div>

      {/* 바디 */}
      {loading ? (
        <div className="h-[72px] 2xl:h-[90px] rounded-md bg-neutral-800 animate-pulse" />
      ) : err ? (
        <div className="text-sm text-amber-500">⚠ {err}</div>
      ) : (
        <>
          <div className="mt-1 2xl:mt-2">
            <div className="h-6 2xl:h-8 w-full bg-neutral-800 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-red-500/80" />
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, longPct ?? 0))}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[12px] 2xl:text-sm mt-1 2xl:mt-2">
              <span className="text-emerald-400 font-medium">
                Long {longPct?.toFixed(2)}%
              </span>
              <span className="text-red-400 font-medium">
                Short {shortPct?.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="mt-1 2xl:mt-2 text-[11px] 2xl:text-xs text-neutral-400">
            {ts ? new Date(ts).toLocaleString("en-US") : ""}
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
              Indicator Info ({source === "top-trader" ? "Top Trader" : source === "global" ? "Global" : "Taker"})
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

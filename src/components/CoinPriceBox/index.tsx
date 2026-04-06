"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import SymbolPickerModal from "@/components/SymbolPickerModal";
import { supabase } from "@/lib/supabase-browser";

// 코인 로고 URL 생성 (USDT 제거한 base symbol 사용)
function getCoinLogoUrl(symbol: string): string {
    const base = symbol.toUpperCase().replace(/USDT$/, "").toLowerCase();
    return `https://assets.coincap.io/assets/icons/${base}@2x.png`;
}

type Props = { boxId: string; defaultSymbol?: string; fadeDelay?: number };

// Binance ExchangeInfo 타입
interface BinanceExchangeInfo {
    symbols: {
        symbol: string;
        filters: {
            filterType: string;
            tickSize?: string;
        }[];
    }[];
}

// 모듈 레벨 precision 캐시 (모든 인스턴스가 공유)
const globalPrecisionCache: Record<string, number> = {};
const pendingRequests: Record<string, Promise<number>> = {};

// 배치 ticker fetch (50ms 내 요청을 모아 한번에 호출 → 동시에 표시)
type TickerData = { lastPrice: string; priceChangePercent: string; symbol: string };
type TickerCallback = (d: TickerData | null) => void;
let tickerQueue: { symbol: string; resolve: TickerCallback }[] = [];
let tickerTimer: ReturnType<typeof setTimeout> | null = null;

function fetchTickerBatched(sym: string): Promise<TickerData | null> {
    return new Promise((resolve) => {
        tickerQueue.push({ symbol: sym.toUpperCase(), resolve });
        if (!tickerTimer) {
            tickerTimer = setTimeout(async () => {
                const batch = tickerQueue;
                tickerQueue = [];
                tickerTimer = null;

                const symbols = [...new Set(batch.map((b) => b.symbol))];
                try {
                    const param = JSON.stringify(symbols);
                    const res = await fetch(
                        `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(param)}`,
                    );
                    const list = (await res.json()) as TickerData[];
                    const map = new Map(list.map((t) => [t.symbol, t]));
                    batch.forEach((b) => b.resolve(map.get(b.symbol) ?? null));
                } catch {
                    batch.forEach((b) => b.resolve(null));
                }
            }, 50);
        }
    });
}

function decimalsFromTickSize(tick: string) {
    const i = tick.indexOf(".");
    if (i === -1) return 0;
    const frac = tick.slice(i + 1);
    const trimmed = frac.replace(/0+$/, "");
    return trimmed.length || frac.length;
}

async function fetchPrecision(sym: string): Promise<number> {
    const key = sym.toUpperCase();
    if (globalPrecisionCache[key] != null) return globalPrecisionCache[key];

    // 동일 심볼 동시 요청 중복 방지
    if (key in pendingRequests) return pendingRequests[key];

    pendingRequests[key] = (async () => {
        try {
            const res = await fetch(
                `https://api.binance.com/api/v3/exchangeInfo?symbol=${key}`,
            );
            const info = (await res.json()) as BinanceExchangeInfo;
            const filters = info.symbols?.[0]?.filters ?? [];
            const pf = filters.find((f) => f.filterType === "PRICE_FILTER");
            const tick = pf?.tickSize ?? "0.01";
            const d = decimalsFromTickSize(tick);
            globalPrecisionCache[key] = d;
            return d;
        } catch {
            return 2;
        } finally {
            delete pendingRequests[key];
        }
    })();

    return pendingRequests[key];
}

export const CoinPriceBox = ({ boxId, defaultSymbol = "btcusdt", fadeDelay = 0 }: Props) => {
    const initialSymbol = defaultSymbol.toLowerCase();

    const [symbol, setSymbol] = useState(initialSymbol);
    const [price, setPrice] = useState<number | null>(null);
    const [pct, setPct] = useState<number | null>(null);
    const [open, setOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [hovered, setHovered] = useState(false);
    const [priceFlash, setPriceFlash] = useState<"up" | "down" | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const verRef = useRef(0);
    const reconnectTimer = useRef<number | null>(null);
    const prevPriceRef = useRef<number | null>(null);

    const [decimals, setDecimals] = useState<number>(2);

    const loadPrecision = async (sym: string) => {
        const d = await fetchPrecision(sym);
        setDecimals(d);
    };

    const usdFormatter = useMemo(
        () =>
            new Intl.NumberFormat("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: Math.max(2, decimals),
            }),
        [decimals],
    );

    const getDisplayPrice = (): string => {
        return price != null ? `$${usdFormatter.format(price)}` : "$—";
    };

    // 세션 + 심볼 불러오기
    useEffect(() => {
        const { data: sub } = supabase.auth.onAuthStateChange(
            async (_e, session) => {
                const uid = session?.user?.id ?? null;
                setUserId(uid);

                if (uid) {
                    const { data: row } = await supabase
                        .from("user_symbol_prefs")
                        .select("symbol")
                        .eq("user_id", uid)
                        .eq("box_id", boxId)
                        .maybeSingle();
                    if (row?.symbol) setSymbol(row.symbol.toLowerCase());
                    else setSymbol(initialSymbol);
                } else {
                    const loc = localStorage.getItem(`coin_box:${boxId}`);
                    setSymbol(loc ?? initialSymbol);
                }
            },
        );

        (async () => {
            const { data } = await supabase.auth.getSession();
            const uid = data.session?.user?.id ?? null;
            setUserId(uid);

            if (uid) {
                const { data: row } = await supabase
                    .from("user_symbol_prefs")
                    .select("symbol")
                    .eq("user_id", uid)
                    .eq("box_id", boxId)
                    .maybeSingle();
                if (row?.symbol) setSymbol(row.symbol.toLowerCase());
            } else {
                const loc = localStorage.getItem(`coin_box:${boxId}`);
                if (loc) setSymbol(loc);
            }
        })();

        return () => sub.subscription.unsubscribe();
    }, [boxId, initialSymbol]);

    // precision 불러오기
    useEffect(() => {
        loadPrecision(symbol);
    }, [symbol]);

    // Binance WebSocket
    useEffect(() => {
        const myVer = ++verRef.current;
        setPrice(null);
        setPct(null);

        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        if (wsRef.current) {
            try {
                wsRef.current.close(1000, "symbol change");
            } catch {}
            wsRef.current = null;
        }

        // 배치 REST로 현재가 즉시 fetch (50ms 내 요청 모아서 1회 호출 → 4개 동시 표시)
        fetchTickerBatched(symbol).then((d) => {
            if (!d || verRef.current !== myVer) return;
            const p = parseFloat(d.lastPrice);
            const c = parseFloat(d.priceChangePercent);
            if (!Number.isNaN(p)) setPrice(p);
            if (!Number.isNaN(c)) setPct(c);
        });

        const stream = symbol.toLowerCase();
        const url = `wss://stream.binance.com:9443/ws/${stream}@ticker`;

        const connect = () => {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onmessage = (ev: MessageEvent<string>) => {
                if (verRef.current !== myVer) return;
                const d = JSON.parse(ev.data) as { c: string; P: string };
                const last = parseFloat(d?.c);
                const changePct = parseFloat(d?.P);

                if (!Number.isNaN(last)) {
                    // 가격 변동 플래시 효과
                    if (prevPriceRef.current !== null && last !== prevPriceRef.current) {
                        setPriceFlash(last > prevPriceRef.current ? "up" : "down");
                        setTimeout(() => setPriceFlash(null), 300);
                    }
                    prevPriceRef.current = last;
                    setPrice(last);
                }
                if (!Number.isNaN(changePct)) setPct(changePct);
            };

            ws.onclose = () => {
                if (verRef.current === myVer) {
                    reconnectTimer.current = window.setTimeout(connect, 1200);
                }
            };

            ws.onerror = () => {
                try {
                    ws.close();
                } catch {}
            };
        };

        connect();

        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                try {
                    wsRef.current.close(1000, "cleanup");
                } catch {}
            }
        };
    }, [symbol]);

    const saveSymbol = async (next: string) => {
        const s = next.toLowerCase();
        setSymbol(s);
        if (userId) {
            await supabase
                .from("user_symbol_prefs")
                .upsert([{ user_id: userId, box_id: boxId, symbol: s }], {
                    onConflict: "user_id,box_id",
                });
        } else {
            localStorage.setItem(`coin_box:${boxId}`, s);
        }
    };

    const pctColor =
        pct == null
            ? "text-gray-300"
            : pct > 0
              ? "text-emerald-500"
              : "text-red-500";
    const arrow = pct == null ? "" : pct > 0 ? "▲" : pct < 0 ? "▼" : "•";
    const pctText =
        pct == null ? "" : `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;

    return (
        <>
            <div
                className="relative w-full"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <button
                    onClick={() => setOpen(true)}
                    className="flex-1 min-w-0 w-full min-h-26 2xl:min-h-40 cursor-pointer rounded-lg border border-neutral-800 bg-neutral-900 p-2 2xl:p-4 shadow-md transition hover:border-neutral-700 flex flex-col items-center justify-center overflow-hidden"
                >
                    <div className={`flex flex-col items-center gap-1 2xl:gap-2 transition-[opacity,transform] duration-700 ${price != null ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${fadeDelay}ms`, transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
                        <div className="relative w-8 h-8 2xl:w-10 2xl:h-10 flex-shrink-0">
                            <Image
                                src={getCoinLogoUrl(symbol)}
                                alt={symbol}
                                fill
                                className="object-contain rounded-full"
                                unoptimized
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                        <h2 className="text-sm 2xl:text-base font-bold text-white">
                            {symbol.toUpperCase()}
                        </h2>
                        <p className={`text-lg 2xl:text-2xl font-mono tabular-nums transition-colors duration-150 rounded px-1 ${pctColor} ${priceFlash === "up" ? "bg-emerald-500/20" : priceFlash === "down" ? "bg-red-500/20" : ""}`}>
                            {getDisplayPrice()}
                        </p>
                        <div className={`text-xs 2xl:text-sm font-semibold ${pctColor}`}>
                            {pct != null ? `${arrow} ${pctText}` : "—"}
                        </div>
                    </div>
                </button>

                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] z-50 w-[200px] rounded-lg bg-neutral-900 border border-neutral-700 py-2 px-3 text-[11px] text-neutral-200 shadow-lg pointer-events-none"
                        >
                            클릭 시 코인 심볼을 변경할 수 있습니다.
                            {/* 테두리가 있는 삼각형 화살표 */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <SymbolPickerModal
                open={open}
                initialSymbol={symbol}
                onClose={() => setOpen(false)}
                onSelect={saveSymbol}
            />
        </>
    );
};

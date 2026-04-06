"use client";

import { useEffect, useRef, useState } from "react";
import {
    createChart,
    CandlestickSeries,
    HistogramSeries,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type UTCTimestamp,
    type IPriceLine,
} from "lightweight-charts";
import { toIstUtcTimestamp } from "@/lib/time";
import type { KlineRow, KlineMessage, Interval } from "@/types/binance";
import type { SimPosition } from "@/types/sim-trading";
import SymbolPickerModal from "@/components/SymbolPickerModal";
import { supabase } from "@/lib/supabase-browser";
import { AnimatePresence, motion } from "framer-motion";

interface BinanceExchangeInfo {
    symbols: Array<{
        symbol: string;
        filters: Array<{
            filterType: "PRICE_FILTER" | string;
            tickSize?: string;
        }>;
    }>;
}

type Props = {
    boxId?: string;
    symbol?: string;
    interval?: Interval;
    historyLimit?: number;
    className?: string;
    fadeDelay?: number;
    /** 심볼 변경 버튼/심볼 표시/툴팁 숨김 (모의투자용) */
    hideControls?: boolean;
    /** 현재 심볼의 오픈 포지션 목록 (차트에 진입가 라인 표시) */
    positions?: SimPosition[];
    /** TP/SL 라인 드래그 완료 시 콜백 */
    onUpdateTpSl?: (positionId: string, tp: number | null, sl: number | null) => Promise<void>;
};

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
];

export default function CoinChart({
    boxId = "chart-1",
    symbol = "BTCUSDT",
    interval: defaultInterval = "1m",
    historyLimit = 500,
    className,
    fadeDelay = 0,
    hideControls = false,
    positions,
    onUpdateTpSl,
}: Props) {
    const outerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const priceLinesRef = useRef<IPriceLine[]>([]);
    // TP/SL 드래그용
    const draggingRef = useRef<{ posId: string; type: "tp" | "sl"; line: IPriceLine } | null>(null);
    const tpSlLinesRef = useRef<Array<{ posId: string; type: "tp" | "sl"; line: IPriceLine }>>([]);
    const onUpdateTpSlRef = useRef(onUpdateTpSl);
    onUpdateTpSlRef.current = onUpdateTpSl;
    const positionsRef = useRef(positions);
    positionsRef.current = positions;
    const [sym, setSym] = useState(symbol.toUpperCase());
    const [interval, setInterval] = useState<Interval>(defaultInterval);

    // 외부 symbol prop 변경 시 내부 sym 동기화
    useEffect(() => {
        setSym(symbol.toUpperCase());
    }, [symbol]);
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [theme, setTheme] = useState<"dark" | "light">("light");
    const [chartLoading, setChartLoading] = useState(true);

    // 심볼별 precision 캐시
    const precisionCache = useRef<
        Record<string, { decimals: number; minMove: number }>
    >({});

    const decimalsFromTickSize = (tick: string) => {
        const i = tick.indexOf(".");
        if (i === -1) return 0;
        const frac = tick.slice(i + 1);
        const trimmed = frac.replace(/0+$/, "");
        return trimmed.length || frac.length;
    };

    const minMoveFromTickSize = (tick: string) => {
        const n = Number(tick);
        return Number.isFinite(n) ? n : 0.01;
    };

    // 테마 변경 감지
    useEffect(() => {
        const html = document.documentElement;
        setTheme(html.classList.contains("light") ? "light" : "dark");

        const observer = new MutationObserver(() => {
            setTheme(html.classList.contains("light") ? "light" : "dark");
        });
        observer.observe(html, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    // 유저 세션 + 저장된 심볼 불러오기 (hideControls일 때는 symbol prop만 사용)
    useEffect(() => {
        // 인터벌은 항상 불러오기
        const savedInterval = localStorage.getItem(
            `chart:${boxId}:interval`,
        );
        if (
            savedInterval &&
            INTERVAL_OPTIONS.some((o) => o.value === savedInterval)
        ) {
            setInterval(savedInterval as Interval);
        }

        if (hideControls) return; // 모의투자 모드에서는 symbol을 prop으로만 제어

        let unsub: { subscription: { unsubscribe(): void } } | null = null;

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
                if (row?.symbol) setSym(String(row.symbol).toUpperCase());
            } else {
                const loc = localStorage.getItem(`chart:${boxId}`);
                if (loc) setSym(loc.toUpperCase());
            }

            const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
                const nuid = s?.user?.id ?? null;
                setUserId(nuid);
                if (nuid) {
                    supabase
                        .from("user_symbol_prefs")
                        .select("symbol")
                        .eq("user_id", nuid)
                        .eq("box_id", boxId)
                        .maybeSingle()
                        .then(({ data: r }) => {
                            if (r?.symbol)
                                setSym(String(r.symbol).toUpperCase());
                        });
                } else {
                    const l = localStorage.getItem(`chart:${boxId}`);
                    if (l) setSym(l.toUpperCase());
                }
            });
            unsub = sub;
        })();

        return () => {
            unsub?.subscription.unsubscribe();
        };
    }, [boxId, hideControls]);

    // 차트 생성 + 안전정리
    useEffect(() => {
        const el = chartRef.current;
        if (!el) return;

        let destroyed = false;
        let ws: WebSocket | null = null;
        let reconnectTimer: number | null = null;
        let ro: ResizeObserver | null = null;

        setChartLoading(true);
        const isLight = theme === "light";

        const chart: IChartApi = createChart(el, {
            width: el.clientWidth,
            height: el.clientHeight,
            layout: {
                background: { color: isLight ? "#ffffff" : "#171717" },
                textColor: isLight ? "#333333" : "#E5E5E5",
            },
            grid: {
                vertLines: { color: isLight ? "#e0e0e0" : "#1F1F1F" },
                horzLines: { color: isLight ? "#e0e0e0" : "#1F1F1F" },
            },
            rightPriceScale: { borderColor: isLight ? "#d0d0d0" : "#2A2A2A" },
            timeScale: { borderColor: isLight ? "#d0d0d0" : "#2A2A2A" },
        });

        chartApiRef.current = chart;

        chart.timeScale().applyOptions({
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 0,
            lockVisibleTimeRangeOnResize: true,
            shiftVisibleRangeOnNewBar: true,
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            borderVisible: false,
        });
        candleSeriesRef.current = candleSeries;

        // 거래량 히스토그램
        const volumeSeries = chart.addSeries(HistogramSeries, {
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
            lastValueVisible: false,
            priceLineVisible: false,
        });
        chart.priceScale("volume").applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            visible: false,
        });

        // tickSize 기준으로 가격 포맷 설정
        (async () => {
            try {
                const key = sym.toUpperCase();
                let dec = 2;
                let mm = 0.01;

                if (precisionCache.current[key]) {
                    dec = precisionCache.current[key].decimals;
                    mm = precisionCache.current[key].minMove;
                } else {
                    const res = await fetch(
                        `https://api.binance.com/api/v3/exchangeInfo?symbol=${key}`,
                    );
                    const info = (await res.json()) as BinanceExchangeInfo;
                    const pf = info.symbols?.[0]?.filters?.find(
                        (f) => f.filterType === "PRICE_FILTER",
                    );
                    const tick = pf?.tickSize ?? "0.01";
                    dec = decimalsFromTickSize(tick);
                    mm = minMoveFromTickSize(tick);
                    precisionCache.current[key] = {
                        decimals: dec,
                        minMove: mm,
                    };
                }

                if (!destroyed) {
                    candleSeries.applyOptions({
                        priceFormat: {
                            type: "price",
                            precision: dec,
                            minMove: mm,
                        },
                    });
                }
            } catch {
                if (!destroyed) {
                    candleSeries.applyOptions({
                        priceFormat: {
                            type: "price",
                            precision: 2,
                            minMove: 0.01,
                        },
                    });
                }
            }
        })();

        // 데이터 추적
        let dataLength = 0;
        let oldestTime = 0; // 가장 오래된 캔들 타임스탬프 (ms)
        let isLoadingMore = false; // 추가 로딩 중 플래그
        let allDataLoaded = false; // 더 이상 데이터 없음 플래그

        // 스크롤 감지: 미래 방지 + 과거 무한스크롤
        chart.timeScale().subscribeVisibleLogicalRangeChange(async (range) => {
            if (!range || destroyed) return;

            // 미래 영역 스크롤 제한 (visible 영역의 1/3까지만 허용)
            const maxRight = dataLength - 1;
            const visibleBars = range.to - range.from;
            const maxAllowedRight = maxRight + Math.floor(visibleBars / 3);
            if (range.to > maxAllowedRight) {
                chart.timeScale().setVisibleLogicalRange({
                    from: maxAllowedRight - visibleBars,
                    to: maxAllowedRight,
                });
            }

            // 과거 데이터 무한스크롤: 왼쪽 끝 근처에서 추가 로드
            if (
                range.from < 20 &&
                !isLoadingMore &&
                !allDataLoaded &&
                oldestTime > 0
            ) {
                isLoadingMore = true;
                try {
                    const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&endTime=${oldestTime - 1}&limit=${historyLimit}`;
                    const res = await fetch(url);
                    const rows = (await res.json()) as KlineRow[];

                    if (destroyed) return;

                    if (!rows || rows.length === 0) {
                        allDataLoaded = true;
                        return;
                    }

                    // 기존 데이터 가져오기
                    const currentData =
                        candleSeries.data() as CandlestickData<UTCTimestamp>[];
                    const currentVolData = volumeSeries.data() as Array<{
                        time: UTCTimestamp;
                        value: number;
                        color: string;
                    }>;

                    // 새 데이터 변환
                    const newData: CandlestickData<UTCTimestamp>[] = rows.map(
                        (d) => ({
                            time: toIstUtcTimestamp(d[0]) as UTCTimestamp,
                            open: parseFloat(d[1]),
                            high: parseFloat(d[2]),
                            low: parseFloat(d[3]),
                            close: parseFloat(d[4]),
                        }),
                    );

                    const newVolData = rows.map((d) => {
                        const o = parseFloat(d[1]);
                        const c = parseFloat(d[4]);
                        return {
                            time: toIstUtcTimestamp(d[0]) as UTCTimestamp,
                            value: parseFloat(d[5]),
                            color:
                                c >= o
                                    ? "rgba(38,166,154,0.3)"
                                    : "rgba(239,83,80,0.3)",
                        };
                    });

                    // 중복 제거 후 병합 (새 데이터 + 기존 데이터)
                    const existingTimes = new Set(
                        currentData.map((d) => d.time),
                    );
                    const uniqueNewData = newData.filter(
                        (d) => !existingTimes.has(d.time),
                    );
                    const uniqueNewVolData = newVolData.filter(
                        (d) => !existingTimes.has(d.time),
                    );

                    if (uniqueNewData.length === 0) {
                        allDataLoaded = true;
                        return;
                    }

                    const mergedData = [...uniqueNewData, ...currentData];
                    const mergedVolData = [
                        ...uniqueNewVolData,
                        ...currentVolData,
                    ];
                    candleSeries.setData(mergedData);
                    volumeSeries.setData(mergedVolData);

                    // 상태 업데이트
                    dataLength = mergedData.length;
                    oldestTime = rows[0][0] as number;

                    // 스크롤 위치 보정 (새로 추가된 만큼 오른쪽으로)
                    const addedBars = uniqueNewData.length;
                    chart.timeScale().setVisibleLogicalRange({
                        from: range.from + addedBars,
                        to: range.to + addedBars,
                    });
                } catch (e) {
                    console.error("Failed to load more data:", e);
                } finally {
                    isLoadingMore = false;
                }
            }
        });

        // 과거 데이터
        async function loadHistory() {
            try {
                const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${interval}&limit=${historyLimit}`;
                const res = await fetch(url);
                const rows = (await res.json()) as KlineRow[];
                if (destroyed) return;

                dataLength = rows.length;
                // 가장 오래된 캔들 시간 저장 (무한스크롤용)
                if (rows.length > 0) {
                    oldestTime = rows[0][0] as number;
                }

                const candles = rows.map((d) => ({
                    time: toIstUtcTimestamp(d[0]),
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                }));
                candleSeries.setData(candles);

                volumeSeries.setData(
                    rows.map((d) => {
                        const o = parseFloat(d[1]);
                        const c = parseFloat(d[4]);
                        return {
                            time: toIstUtcTimestamp(d[0]),
                            value: parseFloat(d[5]),
                            color:
                                c >= o
                                    ? "rgba(38,166,154,0.3)"
                                    : "rgba(239,83,80,0.3)",
                        };
                    }),
                );
                setChartLoading(false);
            } catch (e) {
                console.error(e);
                setChartLoading(false);
            }
        }

        // 실시간
        function openWs() {
            const stream = `${sym.toLowerCase()}@kline_${interval}`;
            ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);

            ws.onmessage = (ev: MessageEvent<string>) => {
                if (destroyed) return;
                try {
                    const msg = JSON.parse(ev.data) as KlineMessage;
                    const k = msg.k;
                    candleSeries.update({
                        time: toIstUtcTimestamp(k.t),
                        open: parseFloat(k.o),
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: parseFloat(k.c),
                    });
                    const kOpen = parseFloat(k.o);
                    const kClose = parseFloat(k.c);
                    volumeSeries.update({
                        time: toIstUtcTimestamp(k.t),
                        value: parseFloat(k.v),
                        color:
                            kClose >= kOpen
                                ? "rgba(38,166,154,0.3)"
                                : "rgba(239,83,80,0.3)",
                    });
                    // 새 캔들이 확정되면 dataLength 증가
                    if (k.x) dataLength++;
                } catch {}
            };

            ws.onclose = () => {
                if (!destroyed) {
                    reconnectTimer = window.setTimeout(openWs, 1000);
                }
            };

            ws.onerror = () => {
                try {
                    ws?.close();
                } catch {}
            };
        }

        loadHistory()
            .then(openWs)
            .catch(() => {});

        ro = new ResizeObserver(() => {
            if (destroyed) return;
            try {
                chart.applyOptions({
                    width: el.clientWidth,
                    height: el.clientHeight,
                });
            } catch {}
        });
        ro.observe(el);

        return () => {
            destroyed = true;
            candleSeriesRef.current = null;
            chartApiRef.current = null;
            priceLinesRef.current = [];
            tpSlLinesRef.current = [];

            try {
                ro?.disconnect();
            } catch {}
            ro = null;

            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            if (ws) {
                try {
                    ws.onmessage = null;
                    ws.onclose = null;
                    ws.onerror = null;
                    ws.close();
                } catch {}
                ws = null;
            }

            try {
                chart.remove();
            } catch {}
        };
    }, [sym, interval, historyLimit, theme]);

    // 포지션 진입가 + 청산가 라인 표시
    useEffect(() => {
        const series = candleSeriesRef.current;
        if (!series || !positions) return;

        // 기존 라인 제거
        for (const line of priceLinesRef.current) {
            try { series.removePriceLine(line); } catch {}
        }
        priceLinesRef.current = [];
        tpSlLinesRef.current = [];

        // 현재 심볼의 OPEN 포지션만 필터
        const currentPositions = positions.filter(
            (p) => p.symbol === sym && p.status === "OPEN"
        );

        for (const pos of currentPositions) {
            const isLong = pos.side === "LONG";

            // 진입가 라인
            const entryLine = series.createPriceLine({
                price: pos.entry_price,
                color: isLong ? "#26a69a" : "#ef5350",
                lineWidth: 1,
                lineStyle: 1, // Dashed
                axisLabelVisible: true,
                title: `${pos.side} 진입 $${pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            });
            priceLinesRef.current.push(entryLine);

            // 청산가 라인
            if (pos.liq_price > 0) {
                const liqLine = series.createPriceLine({
                    price: pos.liq_price,
                    color: "#f97316", // orange
                    lineWidth: 1,
                    lineStyle: 2, // Dotted
                    axisLabelVisible: true,
                    title: `${pos.side} 청산 $${pos.liq_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                });
                priceLinesRef.current.push(liqLine);
            }

            // TP 라인
            if (pos.tp_price && pos.tp_price > 0) {
                const tpLine = series.createPriceLine({
                    price: pos.tp_price,
                    color: "#22c55e",
                    lineWidth: 1,
                    lineStyle: 2, // Dotted
                    axisLabelVisible: true,
                    title: `TP $${pos.tp_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                });
                priceLinesRef.current.push(tpLine);
                tpSlLinesRef.current.push({ posId: pos.id, type: "tp", line: tpLine });
            }

            // SL 라인
            if (pos.sl_price && pos.sl_price > 0) {
                const slLine = series.createPriceLine({
                    price: pos.sl_price,
                    color: "#ef4444",
                    lineWidth: 1,
                    lineStyle: 2, // Dotted
                    axisLabelVisible: true,
                    title: `SL $${pos.sl_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                });
                priceLinesRef.current.push(slLine);
                tpSlLinesRef.current.push({ posId: pos.id, type: "sl", line: slLine });
            }
        }
    }, [positions, sym]);

    // TP/SL 라인 드래그 핸들링
    useEffect(() => {
        const el = chartRef.current;
        if (!el || !onUpdateTpSl) return;

        const DRAG_THRESHOLD_PX = 10;

        const handleMouseDown = (e: MouseEvent) => {
            const series = candleSeriesRef.current;
            if (!series || tpSlLinesRef.current.length === 0) return;

            const rect = el.getBoundingClientRect();
            const y = e.clientY - rect.top;

            for (const item of tpSlLinesRef.current) {
                const lineY = series.priceToCoordinate(item.line.options().price);
                if (lineY !== null && Math.abs(y - (lineY as number)) < DRAG_THRESHOLD_PX) {
                    draggingRef.current = { posId: item.posId, type: item.type, line: item.line };
                    el.style.cursor = "grabbing";
                    // 차트 스크롤 비활성화
                    chartApiRef.current?.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const series = candleSeriesRef.current;
            if (!series) return;

            if (!draggingRef.current) {
                // TP/SL 라인 근처에서 커서 변경
                const rect = el.getBoundingClientRect();
                const y = e.clientY - rect.top;
                let near = false;
                for (const item of tpSlLinesRef.current) {
                    const lineY = series.priceToCoordinate(item.line.options().price);
                    if (lineY !== null && Math.abs(y - (lineY as number)) < DRAG_THRESHOLD_PX) {
                        near = true;
                        break;
                    }
                }
                el.style.cursor = near ? "grab" : "";
                return;
            }

            const rect = el.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const newPrice = series.coordinateToPrice(y);
            if (newPrice !== null && (newPrice as number) > 0) {
                const drag = draggingRef.current;
                drag.line.applyOptions({
                    price: newPrice as number,
                    title: `${drag.type.toUpperCase()} $${(newPrice as number).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                });
            }
        };

        const handleMouseUp = async () => {
            if (!draggingRef.current) return;

            const drag = draggingRef.current;
            const finalPrice = drag.line.options().price;
            draggingRef.current = null;
            el.style.cursor = "";
            // 차트 스크롤 재활성화
            chartApiRef.current?.applyOptions({ handleScroll: { pressedMouseMove: true } });

            const pos = positionsRef.current?.find(p => p.id === drag.posId);
            if (!pos) return;

            const newTp = drag.type === "tp" ? finalPrice : (pos.tp_price ?? null);
            const newSl = drag.type === "sl" ? finalPrice : (pos.sl_price ?? null);

            try {
                await onUpdateTpSlRef.current?.(drag.posId, newTp, newSl);
            } catch (e) {
                console.error("Failed to update TP/SL:", e);
            }
        };

        el.addEventListener("mousedown", handleMouseDown, true);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            el.removeEventListener("mousedown", handleMouseDown, true);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [positions, sym, onUpdateTpSl]);

    const saveSymbol = async (next: string) => {
        const s = next.toUpperCase();
        setSym(s);
        if (userId) {
            await supabase
                .from("user_symbol_prefs")
                .upsert([{ user_id: userId, box_id: boxId, symbol: s }], {
                    onConflict: "user_id,box_id",
                });
        } else {
            localStorage.setItem(`chart:${boxId}`, s);
        }
    };

    return (
        <>
            {/* 바깥 래퍼: overflow-visible (툴팁이 잘리지 않게) */}
            <div
                ref={outerRef}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`relative w-full ${className ?? ""}`}
            >
                {/* 실제 차트 박스 */}
                <div
                    className={`relative w-full ${className ? "h-full" : "h-30 2xl:h-45"}`}
                >
                    <div
                        ref={chartRef}
                        className={`w-full h-full rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 cursor-grab active:cursor-grabbing transition-[opacity,transform] duration-700 ${chartLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
                        style={{
                            transitionDelay: `${fadeDelay}ms`,
                            transitionTimingFunction:
                                "cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    />
                    {/* Interval selector */}
                    <div className="absolute top-2 left-2 flex gap-0.5 bg-neutral-900/80 backdrop-blur-sm rounded-lg p-0.5 border border-neutral-700/50 z-20">
                        {INTERVAL_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => {
                                    setInterval(opt.value);
                                    localStorage.setItem(
                                        `chart:${boxId}:interval`,
                                        opt.value,
                                    );
                                }}
                                className={`px-1.5 py-0.5 text-[10px] 2xl:text-xs rounded-md transition-all cursor-pointer ${
                                    interval === opt.value
                                        ? "bg-amber-500/20 text-amber-300 font-medium"
                                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* Symbol badge */}
                    {!hideControls && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-neutral-900/80 backdrop-blur-sm rounded-md border border-neutral-700/50 z-20">
                            <span className="text-[10px] 2xl:text-xs text-neutral-300 font-medium">
                                {sym}
                            </span>
                        </div>
                    )}
                    {/* Symbol change button */}
                    {!hideControls && (
                        <button
                            onClick={() => setOpen(true)}
                            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-neutral-900/80 backdrop-blur-sm rounded-lg border border-neutral-700/50 z-20 text-[10px] 2xl:text-xs text-neutral-400 hover:text-amber-300 hover:border-amber-500/50 transition-all cursor-pointer"
                        >
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                            </svg>
                            Change
                        </button>
                    )}
                </div>

                {/* Tooltip */}
                <AnimatePresence>
                    {hovered && !hideControls && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            transition={{ duration: 0.18 }}
                            className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+16px)] z-50 w-[295px] text-[11px] bg-neutral-900 border border-neutral-700 text-neutral-300 rounded-lg py-4 px-5 shadow-lg pointer-events-none"
                        >
                            <div className="font-semibold text-amber-300 mb-1">
                                Chart Guide
                            </div>
                            <p className="leading-snug whitespace-nowrap">
                                • Select the <b>interval</b> in the top-left corner.
                                <br />• Use the <b>Change</b> button in the bottom-right to switch coins.
                                <br />• <b>Drag</b> the chart to inspect older price data.
                            </p>
                            {/* 테두리가 있는 삼각형 화살표 */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[9px] w-0 h-0 border-l-[5px] border-r-[5px] border-b-[9px] border-transparent border-b-neutral-700" />
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[7px] w-0 h-0 border-l-4 border-r-4 border-b-[8px] border-transparent border-b-neutral-900" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {!hideControls && (
                <SymbolPickerModal
                    open={open}
                    initialSymbol={sym}
                    onClose={() => setOpen(false)}
                    onSelect={saveSymbol}
                />
            )}
        </>
    );
}

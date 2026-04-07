"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
    createChart,
    AreaSeries,
    BarSeries,
    BaselineSeries,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
    type IChartApi,
    type ISeriesApi,
    type BarData,
    type CandlestickData,
    type UTCTimestamp,
    type IPriceLine,
    type LineData,
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
    showIndicators?: boolean;
    hideIntervals?: boolean;
};

const INTERVAL_OPTIONS: { value: Interval; label: string }[] = [
    { value: "1m", label: "1m" },
    { value: "5m", label: "5m" },
    { value: "15m", label: "15m" },
    { value: "1h", label: "1h" },
    { value: "4h", label: "4h" },
    { value: "1d", label: "1d" },
];

type IndicatorCandle = CandlestickData<UTCTimestamp> & {
    volume: number;
};

type ChartType =
    | "candles"
    | "bars"
    | "line"
    | "area"
    | "baseline"
    | "heikin-ashi";

type MainSeries =
    | ISeriesApi<"Candlestick">
    | ISeriesApi<"Bar">
    | ISeriesApi<"Line">
    | ISeriesApi<"Area">
    | ISeriesApi<"Baseline">;

type DisplaySeriesData =
    | CandlestickData<UTCTimestamp>
    | BarData<UTCTimestamp>
    | LineData<UTCTimestamp>;

type DrawingCategory =
    | "trend-lines"
    | "geometric"
    | "annotation"
    | "forecast";

type DrawingTool =
    | "none"
    | "trend-line"
    | "ray"
    | "info-line"
    | "extended-line"
    | "trend-angle"
    | "horizontal-line"
    | "horizontal-ray"
    | "vertical-line"
    | "cross-line"
    | "rectangle"
    | "arrow"
    | "text";

type DrawingBase = {
    id: string;
    tool: Exclude<DrawingTool, "none">;
};

type LineDrawing = DrawingBase & {
    tool: "trend-line" | "arrow" | "ray" | "info-line" | "extended-line" | "trend-angle";
    startTime: UTCTimestamp;
    startPrice: number;
    endTime: UTCTimestamp;
    endPrice: number;
};

type HorizontalDrawing = DrawingBase & {
    tool: "horizontal-line";
    price: number;
};

type VerticalDrawing = DrawingBase & {
    tool: "vertical-line" | "cross-line";
    time: UTCTimestamp;
    price?: number;
};

type HorizontalRayDrawing = DrawingBase & {
    tool: "horizontal-ray";
    startTime: UTCTimestamp;
    price: number;
};

type RectangleDrawing = DrawingBase & {
    tool: "rectangle";
    startTime: UTCTimestamp;
    startPrice: number;
    endTime: UTCTimestamp;
    endPrice: number;
};

type TextDrawing = DrawingBase & {
    tool: "text";
    time: UTCTimestamp;
    price: number;
    text: string;
};

type Drawing =
    | LineDrawing
    | HorizontalDrawing
    | VerticalDrawing
    | HorizontalRayDrawing
    | RectangleDrawing
    | TextDrawing;

type PendingPoint = {
    time: UTCTimestamp;
    price: number;
};

const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
    { value: "candles", label: "Candles" },
    { value: "bars", label: "Bars" },
    { value: "line", label: "Line" },
    { value: "area", label: "Area" },
    { value: "baseline", label: "Baseline" },
    { value: "heikin-ashi", label: "Heikin Ashi" },
];

const DRAWING_CATEGORIES: Array<{ value: DrawingCategory; label: string }> = [
    { value: "trend-lines", label: "Trend Lines" },
    { value: "geometric", label: "Geometric Shapes" },
    { value: "annotation", label: "Annotation" },
    { value: "forecast", label: "Forecasting" },
];

const DRAWING_TOOLS: Record<
    DrawingCategory,
    Array<{ value: DrawingTool; label: string; enabled: boolean }>
> = {
    "trend-lines": [
        { value: "trend-line", label: "Trend Line", enabled: true },
        { value: "ray", label: "Ray", enabled: true },
        { value: "info-line", label: "Info Line", enabled: true },
        { value: "extended-line", label: "Extended Line", enabled: true },
        { value: "trend-angle", label: "Trend Angle", enabled: true },
        { value: "horizontal-line", label: "Horizontal Line", enabled: true },
        { value: "horizontal-ray", label: "Horizontal Ray", enabled: true },
        { value: "vertical-line", label: "Vertical Line", enabled: true },
        { value: "cross-line", label: "Cross Line", enabled: true },
        { value: "arrow", label: "Arrow", enabled: true },
        { value: "none", label: "Parallel Channel", enabled: false },
        { value: "none", label: "Regression Trend", enabled: false },
        { value: "none", label: "Flat Top / Bottom", enabled: false },
        { value: "none", label: "Disjoint Channel", enabled: false },
        { value: "none", label: "Pitchfork", enabled: false },
        { value: "none", label: "Schiff Pitchfork", enabled: false },
        { value: "none", label: "Modified Schiff Pitchfork", enabled: false },
        { value: "none", label: "Inside Pitchfork", enabled: false },
    ],
    geometric: [
        { value: "rectangle", label: "Rectangle", enabled: true },
    ],
    annotation: [
        { value: "text", label: "Text", enabled: true },
    ],
    forecast: [],
};

function toHeikinAshi(candles: IndicatorCandle[]): IndicatorCandle[] {
    if (candles.length === 0) return [];

    const result: IndicatorCandle[] = [];
    let prevHaOpen = (candles[0].open + candles[0].close) / 2;
    let prevHaClose =
        (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;

    result.push({
        ...candles[0],
        open: prevHaOpen,
        high: Math.max(candles[0].high, prevHaOpen, prevHaClose),
        low: Math.min(candles[0].low, prevHaOpen, prevHaClose),
        close: prevHaClose,
    });

    for (let i = 1; i < candles.length; i++) {
        const candle = candles[i];
        const haClose =
            (candle.open + candle.high + candle.low + candle.close) / 4;
        const haOpen = (prevHaOpen + prevHaClose) / 2;
        const haHigh = Math.max(candle.high, haOpen, haClose);
        const haLow = Math.min(candle.low, haOpen, haClose);

        result.push({
            ...candle,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
        });

        prevHaOpen = haOpen;
        prevHaClose = haClose;
    }

    return result;
}

function toDisplaySeriesData(
    candles: IndicatorCandle[],
    chartType: ChartType
): DisplaySeriesData[] {
    const source = chartType === "heikin-ashi" ? toHeikinAshi(candles) : candles;

    switch (chartType) {
        case "candles":
        case "heikin-ashi":
            return source.map((candle) => ({
                time: candle.time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            }));
        case "bars":
            return source.map((candle) => ({
                time: candle.time,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
            }));
        case "line":
        case "area":
        case "baseline":
            return source.map((candle) => ({
                time: candle.time,
                value: candle.close,
            }));
    }
}

function toDisplayUpdate(
    candle: IndicatorCandle,
    chartType: ChartType
): DisplaySeriesData {
    const source = chartType === "heikin-ashi" ? toHeikinAshi([candle])[0] : candle;

    switch (chartType) {
        case "candles":
        case "heikin-ashi":
        case "bars":
            return {
                time: source.time,
                open: source.open,
                high: source.high,
                low: source.low,
                close: source.close,
            };
        case "line":
        case "area":
        case "baseline":
            return {
                time: source.time,
                value: source.close,
            };
    }
}

function calculateSma(
    candles: IndicatorCandle[],
    period: number
): LineData<UTCTimestamp>[] {
    if (candles.length < period) return [];

    const result: LineData<UTCTimestamp>[] = [];
    let rollingSum = 0;

    for (let i = 0; i < candles.length; i++) {
        rollingSum += candles[i].close;
        if (i >= period) {
            rollingSum -= candles[i - period].close;
        }
        if (i >= period - 1) {
            result.push({
                time: candles[i].time,
                value: rollingSum / period,
            });
        }
    }

    return result;
}

function calculateEma(
    candles: IndicatorCandle[],
    period: number
): LineData<UTCTimestamp>[] {
    if (candles.length < period) return [];

    const multiplier = 2 / (period + 1);
    const result: LineData<UTCTimestamp>[] = [];
    let ema =
        candles.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) /
        period;

    result.push({
        time: candles[period - 1].time,
        value: ema,
    });

    for (let i = period; i < candles.length; i++) {
        ema = (candles[i].close - ema) * multiplier + ema;
        result.push({
            time: candles[i].time,
            value: ema,
        });
    }

    return result;
}

function calculateBollingerBands(
    candles: IndicatorCandle[],
    period = 20,
    stdDevMultiplier = 2
): {
    upper: LineData<UTCTimestamp>[];
    basis: LineData<UTCTimestamp>[];
    lower: LineData<UTCTimestamp>[];
} {
    if (candles.length < period) {
        return { upper: [], basis: [], lower: [] };
    }

    const upper: LineData<UTCTimestamp>[] = [];
    const basis: LineData<UTCTimestamp>[] = [];
    const lower: LineData<UTCTimestamp>[] = [];

    for (let i = period - 1; i < candles.length; i++) {
        const window = candles.slice(i - period + 1, i + 1).map((c) => c.close);
        const mean = window.reduce((sum, value) => sum + value, 0) / period;
        const variance =
            window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
        const stdDev = Math.sqrt(variance);

        basis.push({ time: candles[i].time, value: mean });
        upper.push({
            time: candles[i].time,
            value: mean + stdDev * stdDevMultiplier,
        });
        lower.push({
            time: candles[i].time,
            value: mean - stdDev * stdDevMultiplier,
        });
    }

    return { upper, basis, lower };
}

function calculateVwap(candles: IndicatorCandle[]): LineData<UTCTimestamp>[] {
    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;

    return candles.map((candle) => {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        cumulativeTypicalPriceVolume += typicalPrice * candle.volume;
        cumulativeVolume += candle.volume;

        return {
            time: candle.time,
            value:
                cumulativeVolume > 0
                    ? cumulativeTypicalPriceVolume / cumulativeVolume
                    : typicalPrice,
        };
    });
}

function calculateRsi(
    candles: IndicatorCandle[],
    period = 14
): LineData<UTCTimestamp>[] {
    if (candles.length <= period) return [];

    const changes: number[] = [];
    for (let i = 1; i < candles.length; i++) {
        changes.push(candles[i].close - candles[i - 1].close);
    }

    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        const change = changes[i];
        if (change >= 0) avgGain += change;
        else avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    const result: LineData<UTCTimestamp>[] = [];
    let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    result.push({
        time: candles[period].time,
        value: 100 - 100 / (1 + rs),
    });

    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;

        result.push({
            time: candles[i + 1].time,
            value: 100 - 100 / (1 + rs),
        });
    }

    return result;
}

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
    showIndicators = true,
    hideIntervals = false,
}: Props) {
    const outerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const rsiChartRef = useRef<HTMLDivElement>(null);
    const chartApiRef = useRef<IChartApi | null>(null);
    const rsiChartApiRef = useRef<IChartApi | null>(null);
    const mainSeriesRef = useRef<MainSeries | null>(null);
    const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const sma200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const vwapSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const rsiGuideLinesRef = useRef<IPriceLine[]>([]);
    const bbUpperSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbBasisSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbLowerSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
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
    const [chartType, setChartType] = useState<ChartType>("candles");
    const [showChartTypeMenu, setShowChartTypeMenu] = useState(false);
    const [showDrawingsMenu, setShowDrawingsMenu] = useState(false);
    const [drawingCategory, setDrawingCategory] = useState<DrawingCategory>("trend-lines");
    const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>("none");
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [pendingPoint, setPendingPoint] = useState<PendingPoint | null>(null);
    const [pendingTextPoint, setPendingTextPoint] = useState<PendingPoint | null>(null);
    const [pendingTextValue, setPendingTextValue] = useState("");

    // 외부 symbol prop 변경 시 내부 sym 동기화
    useEffect(() => {
        setSym(symbol.toUpperCase());
    }, [symbol]);
    const [open, setOpen] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [theme, setTheme] = useState<"dark" | "light">("light");
    const [chartLoading, setChartLoading] = useState(true);
    const [showEma20, setShowEma20] = useState(false);
    const [showEma50, setShowEma50] = useState(false);
    const [showSma20, setShowSma20] = useState(false);
    const [showSma200, setShowSma200] = useState(false);
    const [showVwap, setShowVwap] = useState(false);
    const [showBollinger, setShowBollinger] = useState(false);
    const [showRsi, setShowRsi] = useState(false);
    const hasActiveIndicators =
        showIndicators &&
        (showEma20 ||
            showEma50 ||
            showSma20 ||
            showSma200 ||
            showVwap ||
            showBollinger ||
            showRsi);

    // 심볼별 precision 캐시
    const precisionCache = useRef<
        Record<string, { decimals: number; minMove: number }>
    >({});

    const nextDrawingIdRef = useRef(1);

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
        let rsiRo: ResizeObserver | null = null;

        setChartLoading(true);
        const isLight = theme === "light";

        const chart: IChartApi = createChart(el, {
            width: el.clientWidth,
            height: el.clientHeight,
            layout: {
                attributionLogo: false,
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

        let rsiChart: IChartApi | null = null;
        let rsiSeries: ISeriesApi<"Line"> | null = null;
        const rsiEl = rsiChartRef.current;

        if (showRsi && rsiEl) {
            rsiChart = createChart(rsiEl, {
                width: rsiEl.clientWidth,
                height: rsiEl.clientHeight,
                layout: {
                    attributionLogo: false,
                    background: { color: isLight ? "#ffffff" : "#171717" },
                    textColor: isLight ? "#333333" : "#E5E5E5",
                },
                grid: {
                    vertLines: { color: isLight ? "#e0e0e0" : "#1F1F1F" },
                    horzLines: { color: isLight ? "#e0e0e0" : "#1F1F1F" },
                },
                rightPriceScale: {
                    borderColor: isLight ? "#d0d0d0" : "#2A2A2A",
                    visible: false,
                },
                leftPriceScale: {
                    visible: false,
                },
                timeScale: {
                    borderColor: isLight ? "#d0d0d0" : "#2A2A2A",
                    visible: false,
                    timeVisible: true,
                    secondsVisible: false,
                },
                handleScroll: false,
                handleScale: false,
            });

            rsiChartApiRef.current = rsiChart;
            rsiSeries = rsiChart.addSeries(LineSeries, {
                color: "#a78bfa",
                lineWidth: 2,
                priceLineVisible: false,
                lastValueVisible: false,
                crosshairMarkerVisible: false,
            });
            rsiSeriesRef.current = rsiSeries;

            rsiChart.priceScale("right").applyOptions({
                autoScale: true,
                scaleMargins: { top: 0.1, bottom: 0.1 },
            });
            rsiSeries.applyOptions({
                priceFormat: {
                    type: "price",
                    precision: 2,
                    minMove: 0.01,
                },
            });
            rsiGuideLinesRef.current = [
                rsiSeries.createPriceLine({
                    price: 70,
                    color: "rgba(239, 68, 68, 0.7)",
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: "70",
                }),
                rsiSeries.createPriceLine({
                    price: 50,
                    color: "rgba(148, 163, 184, 0.6)",
                    lineWidth: 1,
                    lineStyle: 1,
                    axisLabelVisible: true,
                    title: "50",
                }),
                rsiSeries.createPriceLine({
                    price: 30,
                    color: "rgba(34, 197, 94, 0.7)",
                    lineWidth: 1,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: "30",
                }),
            ];
        } else {
            rsiChartApiRef.current = null;
            rsiSeriesRef.current = null;
            rsiGuideLinesRef.current = [];
        }

        chart.timeScale().applyOptions({
            timeVisible: true,
            secondsVisible: false,
            rightOffset: 0,
            lockVisibleTimeRangeOnResize: true,
            shiftVisibleRangeOnNewBar: true,
        });

        const mainSeries: MainSeries =
            chartType === "candles" || chartType === "heikin-ashi"
                ? chart.addSeries(CandlestickSeries, {
                      upColor: "#26a69a",
                      downColor: "#ef5350",
                      wickUpColor: "#26a69a",
                      wickDownColor: "#ef5350",
                      borderVisible: false,
                  })
                : chartType === "bars"
                    ? chart.addSeries(BarSeries, {
                          upColor: "#26a69a",
                          downColor: "#ef5350",
                          thinBars: false,
                      })
                    : chartType === "line"
                        ? chart.addSeries(LineSeries, {
                              color: "#38bdf8",
                              lineWidth: 2,
                              priceLineVisible: false,
                          })
                        : chartType === "area"
                            ? chart.addSeries(AreaSeries, {
                                  lineColor: "#38bdf8",
                                  topColor: "rgba(56, 189, 248, 0.35)",
                                  bottomColor: "rgba(56, 189, 248, 0.02)",
                                  lineWidth: 2,
                                  priceLineVisible: false,
                              })
                            : chart.addSeries(BaselineSeries, {
                                  baseValue: { type: "price", price: 0 },
                                  topLineColor: "#26a69a",
                                  topFillColor1: "rgba(38, 166, 154, 0.28)",
                                  topFillColor2: "rgba(38, 166, 154, 0.04)",
                                  bottomLineColor: "#ef5350",
                                  bottomFillColor1: "rgba(239, 83, 80, 0.22)",
                                  bottomFillColor2: "rgba(239, 83, 80, 0.03)",
                                  lineWidth: 2,
                                  priceLineVisible: false,
                              });
        mainSeriesRef.current = mainSeries;

        const ema20Series = chart.addSeries(LineSeries, {
            color: "#fbbf24",
            lineWidth: 3,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        ema20SeriesRef.current = ema20Series;

        const ema50Series = chart.addSeries(LineSeries, {
            color: "#22d3ee",
            lineWidth: 3,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        ema50SeriesRef.current = ema50Series;

        const sma20Series = chart.addSeries(LineSeries, {
            color: "#4ade80",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        sma20SeriesRef.current = sma20Series;

        const sma200Series = chart.addSeries(LineSeries, {
            color: "#f472b6",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        sma200SeriesRef.current = sma200Series;

        const vwapSeries = chart.addSeries(LineSeries, {
            color: "#f87171",
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        vwapSeriesRef.current = vwapSeries;

        const bbUpperSeries = chart.addSeries(LineSeries, {
            color: "rgba(196, 181, 253, 0.95)",
            lineWidth: 2,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        bbUpperSeriesRef.current = bbUpperSeries;

        const bbBasisSeries = chart.addSeries(LineSeries, {
            color: "rgba(251, 191, 36, 0.95)",
            lineWidth: 2,
            lineStyle: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        bbBasisSeriesRef.current = bbBasisSeries;

        const bbLowerSeries = chart.addSeries(LineSeries, {
            color: "rgba(196, 181, 253, 0.95)",
            lineWidth: 2,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });
        bbLowerSeriesRef.current = bbLowerSeries;

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
                    mainSeries.applyOptions({
                        priceFormat: {
                            type: "price",
                            precision: dec,
                            minMove: mm,
                        },
                    });
                }
            } catch {
                if (!destroyed) {
                    mainSeries.applyOptions({
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
        let candleDataCache: IndicatorCandle[] = [];
        let oldestTime = 0; // 가장 오래된 캔들 타임스탬프 (ms)
        let isLoadingMore = false; // 추가 로딩 중 플래그
        let allDataLoaded = false; // 더 이상 데이터 없음 플래그

        const applyIndicators = (candles: IndicatorCandle[]) => {
            const ema20 = calculateEma(candles, 20);
            const ema50 = calculateEma(candles, 50);
            const sma20 = calculateSma(candles, 20);
            const sma200 = calculateSma(candles, 200);
            const vwap = calculateVwap(candles);
            const rsi = calculateRsi(candles, 14);
            const bollinger = calculateBollingerBands(candles, 20, 2);

            ema20Series.setData(showIndicators && showEma20 ? ema20 : []);
            ema50Series.setData(showIndicators && showEma50 ? ema50 : []);
            sma20Series.setData(showIndicators && showSma20 ? sma20 : []);
            sma200Series.setData(showIndicators && showSma200 ? sma200 : []);
            vwapSeries.setData(showIndicators && showVwap ? vwap : []);
            bbUpperSeries.setData(showIndicators && showBollinger ? bollinger.upper : []);
            bbBasisSeries.setData(showIndicators && showBollinger ? bollinger.basis : []);
            bbLowerSeries.setData(showIndicators && showBollinger ? bollinger.lower : []);
            rsiSeries?.setData(showIndicators && showRsi ? rsi : []);

            const mainRange = chart.timeScale().getVisibleLogicalRange();
            if (mainRange) {
                rsiChart?.timeScale().setVisibleLogicalRange(mainRange);
            }
        };

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

            rsiChart?.timeScale().setVisibleLogicalRange(range);

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
                    const currentVolData = volumeSeries.data() as Array<{
                        time: UTCTimestamp;
                        value: number;
                        color: string;
                    }>;

                    // 새 데이터 변환
                    const newData: IndicatorCandle[] = rows.map(
                        (d) => ({
                            time: toIstUtcTimestamp(d[0]) as UTCTimestamp,
                            open: parseFloat(d[1]),
                            high: parseFloat(d[2]),
                            low: parseFloat(d[3]),
                            close: parseFloat(d[4]),
                            volume: parseFloat(d[5]),
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
                    const existingTimes = new Set(candleDataCache.map((d) => d.time));
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

                    const mergedData = [
                        ...uniqueNewData,
                        ...candleDataCache.filter(
                            (d) => !uniqueNewData.some((n) => n.time === d.time),
                        ),
                    ];
                    const mergedVolData = [
                        ...uniqueNewVolData,
                        ...currentVolData,
                    ];
                    mainSeries.setData(
                        toDisplaySeriesData(mergedData, chartType) as never,
                    );
                    volumeSeries.setData(mergedVolData);
                    candleDataCache = mergedData;
                    applyIndicators(candleDataCache);

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

                const candles: IndicatorCandle[] = rows.map((d) => ({
                    time: toIstUtcTimestamp(d[0]),
                    open: parseFloat(d[1]),
                    high: parseFloat(d[2]),
                    low: parseFloat(d[3]),
                    close: parseFloat(d[4]),
                    volume: parseFloat(d[5]),
                }));
                mainSeries.setData(
                    toDisplaySeriesData(candles, chartType) as never,
                );
                candleDataCache = candles;
                applyIndicators(candleDataCache);
                chart.timeScale().fitContent();
                const initialRange = chart.timeScale().getVisibleLogicalRange();
                if (initialRange) {
                    rsiChart?.timeScale().setVisibleLogicalRange(initialRange);
                }

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
                    const kOpen = parseFloat(k.o);
                    const kClose = parseFloat(k.c);
                    const nextCandle: IndicatorCandle = {
                        time: toIstUtcTimestamp(k.t),
                        open: kOpen,
                        high: parseFloat(k.h),
                        low: parseFloat(k.l),
                        close: kClose,
                        volume: parseFloat(k.v),
                    };
                    mainSeries.update(
                        toDisplayUpdate(nextCandle, chartType) as never,
                    );
                    const last = candleDataCache[candleDataCache.length - 1];
                    if (last?.time === nextCandle.time) {
                        candleDataCache = [
                            ...candleDataCache.slice(0, -1),
                            nextCandle,
                        ];
                    } else {
                        candleDataCache = [...candleDataCache, nextCandle];
                    }
                    applyIndicators(candleDataCache);

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

                    const liveRange = chart.timeScale().getVisibleLogicalRange();
                    if (liveRange) {
                        rsiChart?.timeScale().setVisibleLogicalRange(liveRange);
                    }
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

        if (rsiChart && rsiEl) {
            rsiRo = new ResizeObserver(() => {
                if (destroyed) return;
                try {
                    rsiChart?.applyOptions({
                        width: rsiEl.clientWidth,
                        height: rsiEl.clientHeight,
                    });
                } catch {}
            });
            rsiRo.observe(rsiEl);
        }

        return () => {
            destroyed = true;
            mainSeriesRef.current = null;
            ema20SeriesRef.current = null;
            ema50SeriesRef.current = null;
            sma20SeriesRef.current = null;
            sma200SeriesRef.current = null;
            vwapSeriesRef.current = null;
            rsiSeriesRef.current = null;
            rsiGuideLinesRef.current = [];
            bbUpperSeriesRef.current = null;
            bbBasisSeriesRef.current = null;
            bbLowerSeriesRef.current = null;
            chartApiRef.current = null;
            rsiChartApiRef.current = null;
            priceLinesRef.current = [];
            tpSlLinesRef.current = [];

            try {
                ro?.disconnect();
            } catch {}
            ro = null;
            try {
                rsiRo?.disconnect();
            } catch {}
            rsiRo = null;

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
            try {
                rsiChart?.remove();
            } catch {}
        };
    }, [sym, interval, historyLimit, theme, chartType, showIndicators, showEma20, showEma50, showSma20, showSma200, showVwap, showBollinger, showRsi]);

    // 포지션 진입가 + 청산가 라인 표시
    useEffect(() => {
        const series = mainSeriesRef.current;
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
                title: `${pos.side} Entry $${pos.entry_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
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
                    title: `${pos.side} Liq $${pos.liq_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
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
            const series = mainSeriesRef.current;
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
            const series = mainSeriesRef.current;
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

    const commitDrawing = (drawing: Drawing) => {
        startTransition(() => {
            setDrawings((prev) => [...prev, drawing]);
        });
    };

    const getChartPoint = (clientX: number, clientY: number): PendingPoint | null => {
        const el = chartRef.current;
        const chart = chartApiRef.current;
        const mainSeries = mainSeriesRef.current;
        if (!el || !chart || !mainSeries) return null;

        const rect = el.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const time = chart.timeScale().coordinateToTime(x);
        const price = mainSeries.coordinateToPrice(y);

        if (time == null || price == null || typeof time !== "number") return null;
        return {
            time: time as UTCTimestamp,
            price: price as number,
        };
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeDrawingTool === "none") return;

        const point = getChartPoint(e.clientX, e.clientY);
        if (!point) return;

        if (activeDrawingTool === "horizontal-line") {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: "horizontal-line",
                price: point.price,
            });
            return;
        }

        if (activeDrawingTool === "vertical-line") {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: "vertical-line",
                time: point.time,
            });
            return;
        }

        if (activeDrawingTool === "cross-line") {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: "cross-line",
                time: point.time,
                price: point.price,
            });
            return;
        }

        if (activeDrawingTool === "horizontal-ray") {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: "horizontal-ray",
                startTime: point.time,
                price: point.price,
            });
            return;
        }

        if (activeDrawingTool === "text") {
            setPendingTextPoint(point);
            setPendingTextValue("");
            return;
        }

        if (!pendingPoint) {
            setPendingPoint(point);
            return;
        }

        if (
            activeDrawingTool === "trend-line" ||
            activeDrawingTool === "arrow" ||
            activeDrawingTool === "ray" ||
            activeDrawingTool === "info-line" ||
            activeDrawingTool === "extended-line" ||
            activeDrawingTool === "trend-angle"
        ) {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: activeDrawingTool,
                startTime: pendingPoint.time,
                startPrice: pendingPoint.price,
                endTime: point.time,
                endPrice: point.price,
            });
            setPendingPoint(null);
            return;
        }

        if (activeDrawingTool === "rectangle") {
            commitDrawing({
                id: `drawing-${nextDrawingIdRef.current++}`,
                tool: "rectangle",
                startTime: pendingPoint.time,
                startPrice: pendingPoint.price,
                endTime: point.time,
                endPrice: point.price,
            });
            setPendingPoint(null);
        }
    };

    const renderDrawings = () => {
        const chart = chartApiRef.current;
        const mainSeries = mainSeriesRef.current;
        const el = chartRef.current;
        if (!chart || !mainSeries || !el) return null;

        const width = el.clientWidth;
        const height = el.clientHeight;

        const lineElements = drawings.map((drawing) => {
            if (drawing.tool === "horizontal-line") {
                const y = mainSeries.priceToCoordinate(drawing.price);
                if (y == null) return null;
                return (
                    <line
                        key={drawing.id}
                        x1={0}
                        y1={y}
                        x2={width}
                        y2={y}
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                        strokeDasharray="6 4"
                    />
                );
            }

            if (drawing.tool === "vertical-line" || drawing.tool === "cross-line") {
                const x = chart.timeScale().timeToCoordinate(drawing.time);
                if (x == null) return null;
                return (
                    <g key={drawing.id}>
                        <line
                            x1={x}
                            y1={0}
                            x2={x}
                            y2={height}
                            stroke="#38bdf8"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                        />
                        {drawing.tool === "cross-line" && drawing.price != null && (() => {
                            const y = mainSeries.priceToCoordinate(drawing.price);
                            if (y == null) return null;
                            return (
                                <line
                                    x1={0}
                                    y1={y}
                                    x2={width}
                                    y2={y}
                                    stroke="#38bdf8"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 4"
                                />
                            );
                        })()}
                    </g>
                );
            }

            if (drawing.tool === "horizontal-ray") {
                const x = chart.timeScale().timeToCoordinate(drawing.startTime);
                const y = mainSeries.priceToCoordinate(drawing.price);
                if (x == null || y == null) return null;
                return (
                    <line
                        key={drawing.id}
                        x1={x}
                        y1={y}
                        x2={width}
                        y2={y}
                        stroke="#fbbf24"
                        strokeWidth="1.5"
                    />
                );
            }

            if (drawing.tool === "rectangle") {
                const x1 = chart.timeScale().timeToCoordinate(drawing.startTime);
                const x2 = chart.timeScale().timeToCoordinate(drawing.endTime);
                const y1 = mainSeries.priceToCoordinate(drawing.startPrice);
                const y2 = mainSeries.priceToCoordinate(drawing.endPrice);
                if (x1 == null || x2 == null || y1 == null || y2 == null) return null;
                return (
                    <rect
                        key={drawing.id}
                        x={Math.min(x1, x2)}
                        y={Math.min(y1, y2)}
                        width={Math.abs(x2 - x1)}
                        height={Math.abs(y2 - y1)}
                        fill="rgba(56, 189, 248, 0.12)"
                        stroke="#38bdf8"
                        strokeWidth="1.5"
                    />
                );
            }

            if (
                drawing.tool === "trend-line" ||
                drawing.tool === "arrow" ||
                drawing.tool === "ray" ||
                drawing.tool === "info-line" ||
                drawing.tool === "extended-line" ||
                drawing.tool === "trend-angle"
            ) {
                const x1 = chart.timeScale().timeToCoordinate(drawing.startTime);
                const x2 = chart.timeScale().timeToCoordinate(drawing.endTime);
                const y1 = mainSeries.priceToCoordinate(drawing.startPrice);
                const y2 = mainSeries.priceToCoordinate(drawing.endPrice);
                if (x1 == null || x2 == null || y1 == null || y2 == null) return null;

                const markerId = `arrowhead-${drawing.id}`;
                const dx = x2 - x1;
                const dy = y2 - y1;
                const safeDx = Math.abs(dx) < 0.001 ? 0.001 : dx;
                const slope = dy / safeDx;
                let lineX1 = x1;
                let lineY1 = y1;
                let lineX2 = x2;
                let lineY2 = y2;

                if (drawing.tool === "ray") {
                    lineX2 = width;
                    lineY2 = y1 + slope * (width - x1);
                } else if (drawing.tool === "extended-line") {
                    lineX1 = 0;
                    lineY1 = y1 - slope * x1;
                    lineX2 = width;
                    lineY2 = y1 + slope * (width - x1);
                }

                const angle =
                    drawing.tool === "trend-angle"
                        ? Math.round((Math.atan2(y1 - y2, x2 - x1) * 180) / Math.PI)
                        : null;
                const infoLabel =
                    drawing.tool === "info-line"
                        ? `${(drawing.endPrice - drawing.startPrice).toFixed(2)}`
                        : angle != null
                            ? `${angle}°`
                            : null;
                return (
                    <g key={drawing.id}>
                        {drawing.tool === "arrow" && (
                            <defs>
                                <marker
                                    id={markerId}
                                    markerWidth="8"
                                    markerHeight="8"
                                    refX="6"
                                    refY="3"
                                    orient="auto"
                                >
                                    <path d="M0,0 L0,6 L6,3 z" fill="#f97316" />
                                </marker>
                            </defs>
                        )}
                        <line
                            x1={lineX1}
                            y1={lineY1}
                            x2={lineX2}
                            y2={lineY2}
                            stroke={drawing.tool === "arrow" ? "#f97316" : "#a78bfa"}
                            strokeWidth="2"
                            markerEnd={drawing.tool === "arrow" ? `url(#${markerId})` : undefined}
                        />
                        {infoLabel && (
                            <text
                                x={lineX2}
                                y={lineY2}
                                dx={8}
                                dy={-8}
                                fill="#e5e7eb"
                                fontSize="10"
                            >
                                {infoLabel}
                            </text>
                        )}
                    </g>
                );
            }

            return null;
        });

        const textElements = drawings.map((drawing) => {
            if (drawing.tool !== "text") return null;
            const x = chart.timeScale().timeToCoordinate(drawing.time);
            const y = mainSeries.priceToCoordinate(drawing.price);
            if (x == null || y == null) return null;
            return (
                <div
                    key={drawing.id}
                    className="absolute rounded-md border border-neutral-700 bg-neutral-950/95 px-2 py-1 text-[10px] text-white shadow-md"
                    style={{
                        left: x,
                        top: y,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    {drawing.text}
                </div>
            );
        });

        return (
            <>
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                    {lineElements}
                </svg>
                {textElements}
            </>
        );
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
            {/* actual chart box */}
                <div
                    className={`relative w-full ${className ? "h-full" : "h-30 2xl:h-45"}`}
                >
                    <div
                        className={`w-full h-full rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900 transition-[opacity,transform] duration-700 ${chartLoading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
                        style={{
                            transitionDelay: `${fadeDelay}ms`,
                            transitionTimingFunction:
                                "cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        <div
                            ref={chartRef}
                            className={`w-full ${showRsi ? "h-[72%]" : "h-full"} cursor-grab active:cursor-grabbing`}
                        />
                        <div
                            className={`absolute inset-0 z-10 ${activeDrawingTool === "none" ? "pointer-events-none" : "pointer-events-auto cursor-crosshair"}`}
                            onClick={handleOverlayClick}
                        >
                            {renderDrawings()}
                        </div>
                        {pendingTextPoint && (() => {
                            const chart = chartApiRef.current;
                            const series = mainSeriesRef.current;
                            if (!chart || !series) return null;
                            const x = chart.timeScale().timeToCoordinate(pendingTextPoint.time);
                            const y = series.priceToCoordinate(pendingTextPoint.price);
                            if (x == null || y == null) return null;
                            return (
                                <div
                                    className="absolute z-20 w-44 rounded-lg border border-neutral-700 bg-neutral-950/95 p-2 shadow-xl"
                                    style={{
                                        left: x,
                                        top: y,
                                        transform: "translate(-50%, -100%)",
                                    }}
                                >
                                    <input
                                        autoFocus
                                        value={pendingTextValue}
                                        onChange={(e) => setPendingTextValue(e.target.value)}
                                        placeholder="Enter note"
                                        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-white outline-none"
                                    />
                                    <div className="mt-2 flex justify-end gap-2 text-[11px]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPendingTextPoint(null);
                                                setPendingTextValue("");
                                            }}
                                            className="text-neutral-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const text = pendingTextValue.trim();
                                                if (!text) return;
                                                commitDrawing({
                                                    id: `drawing-${nextDrawingIdRef.current++}`,
                                                    tool: "text",
                                                    time: pendingTextPoint.time,
                                                    price: pendingTextPoint.price,
                                                    text,
                                                });
                                                setPendingTextPoint(null);
                                                setPendingTextValue("");
                                            }}
                                            className="text-emerald-300 hover:text-emerald-200"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                        {showRsi && (
                            <div className="relative h-[28%] min-h-[110px] border-t border-neutral-800 bg-neutral-900">
                                <div className="absolute left-3 top-2 z-20 rounded bg-neutral-950/90 px-1.5 py-0.5 text-[10px] font-semibold text-violet-200">
                                    RSI 14
                                </div>
                                <div
                                    ref={rsiChartRef}
                                    className="h-full w-full"
                                />
                            </div>
                        )}
                    </div>
                    {/* Interval selector */}
                    {!hideIntervals && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-neutral-950/95 backdrop-blur-sm rounded-lg p-1 border border-neutral-700/60 z-30">
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
                            {showIndicators && (
                                <>
                                    <span className="mx-1 h-4 w-px bg-neutral-700/70" />
                                    <button
                                        type="button"
                                        onClick={() => setShowEma20((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showEma20
                                                ? "bg-amber-500/25 text-amber-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        EMA20
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowEma50((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showEma50
                                                ? "bg-cyan-500/25 text-cyan-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        EMA50
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowBollinger((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showBollinger
                                                ? "bg-violet-500/25 text-violet-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        BB
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSma20((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showSma20
                                                ? "bg-emerald-500/25 text-emerald-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        SMA20
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowSma200((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showSma200
                                                ? "bg-pink-500/25 text-pink-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        SMA200
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowVwap((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showVwap
                                                ? "bg-rose-500/25 text-rose-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        VWAP
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowRsi((prev) => !prev)}
                                        className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                            showRsi
                                                ? "bg-violet-500/25 text-violet-200"
                                                : "text-neutral-400 hover:bg-neutral-700/50 hover:text-neutral-200"
                                        }`}
                                    >
                                        RSI
                                    </button>
                                </>
                            )}
                            <span className="mx-1 h-4 w-px bg-neutral-700/70" />
                            <button
                                type="button"
                                onClick={() => setShowChartTypeMenu((prev) => !prev)}
                                className="rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs text-neutral-300 transition-colors hover:bg-neutral-700/50 hover:text-white"
                            >
                                {CHART_TYPE_OPTIONS.find((opt) => opt.value === chartType)?.label ?? "Type"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowDrawingsMenu((prev) => !prev)}
                                className={`rounded-md px-2 py-0.5 text-[10px] 2xl:text-xs transition-colors ${
                                    showDrawingsMenu || activeDrawingTool !== "none"
                                        ? "bg-emerald-500/20 text-emerald-200"
                                        : "text-neutral-300 hover:bg-neutral-700/50 hover:text-white"
                                }`}
                            >
                                Draw
                            </button>
                        </div>
                    )}
                    {showChartTypeMenu && (
                        <div className="absolute left-2 top-11 z-40 grid w-[240px] grid-cols-2 gap-2 rounded-xl border border-neutral-700/70 bg-neutral-950/95 p-2 backdrop-blur-sm">
                            {CHART_TYPE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        setChartType(option.value);
                                        setShowChartTypeMenu(false);
                                    }}
                                    className={`rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                                        chartType === option.value
                                            ? "bg-neutral-200 text-neutral-950"
                                            : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {showDrawingsMenu && (
                        <div className="absolute left-2 top-11 z-40 w-[320px] rounded-2xl border border-neutral-700/70 bg-neutral-950/95 p-3 backdrop-blur-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-semibold text-white">Drawings</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setActiveDrawingTool("none");
                                        setPendingPoint(null);
                                        setShowDrawingsMenu(false);
                                    }}
                                    className="text-xs text-neutral-400 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>

                            <div className="mb-3 flex flex-wrap gap-2">
                                {DRAWING_CATEGORIES.map((category) => (
                                    <button
                                        key={category.value}
                                        type="button"
                                        onClick={() => setDrawingCategory(category.value)}
                                        className={`rounded-lg px-3 py-1.5 text-[11px] transition-colors ${
                                            drawingCategory === category.value
                                                ? "bg-neutral-200 text-neutral-950"
                                                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                                        }`}
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {DRAWING_TOOLS[drawingCategory].map((tool) => (
                                    <button
                                        key={`${drawingCategory}-${tool.label}`}
                                        type="button"
                                        disabled={!tool.enabled}
                                        onClick={() => {
                                            setActiveDrawingTool(tool.value);
                                            setPendingPoint(null);
                                        }}
                                        className={`rounded-xl px-3 py-3 text-left text-xs transition-colors ${
                                            activeDrawingTool === tool.value
                                                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/40"
                                                : "bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-transparent"
                                        } disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                        {tool.label}
                                    </button>
                                ))}
                                {DRAWING_TOOLS[drawingCategory].length === 0 && (
                                    <div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-4 text-xs text-neutral-400">
                                        Forecast and pattern tools need a larger custom drawing engine. The current chart now supports practical core drawing tools first.
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400">
                                <span>
                                    Active tool:{" "}
                                    <span className="text-neutral-200">
                                        {activeDrawingTool === "none" ? "None" : activeDrawingTool}
                                    </span>
                                </span>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveDrawingTool("none");
                                            setPendingPoint(null);
                                        }}
                                        className="hover:text-white"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDrawings([]);
                                            setPendingPoint(null);
                                        }}
                                        className="hover:text-white"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {drawingCategory === "trend-lines" && (
                                <div className="mt-2 text-[11px] text-neutral-500">
                                    Enabled now: Trend Line, Ray, Info Line, Extended Line, Trend Angle,
                                    Horizontal Line, Horizontal Ray, Vertical Line, Cross Line, Arrow.
                                    The channel and pitchfork tools still need a larger drawing engine.
                                </div>
                            )}
                        </div>
                    )}
                    {hasActiveIndicators && (
                        <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg border border-neutral-700/50 bg-neutral-900/85 px-2 py-1 backdrop-blur-sm z-20">
                            {showEma20 && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-amber-200">
                                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                                    EMA 20
                                </span>
                            )}
                            {showEma50 && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-cyan-200">
                                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                                    EMA 50
                                </span>
                            )}
                            {showBollinger && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-violet-200">
                                    <span className="h-2 w-2 rounded-full bg-violet-300" />
                                    Bollinger
                                </span>
                            )}
                            {showSma20 && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-emerald-200">
                                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                                    SMA 20
                                </span>
                            )}
                            {showSma200 && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-pink-200">
                                    <span className="h-2 w-2 rounded-full bg-pink-300" />
                                    SMA 200
                                </span>
                            )}
                            {showVwap && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-rose-200">
                                    <span className="h-2 w-2 rounded-full bg-rose-300" />
                                    VWAP
                                </span>
                            )}
                            {showRsi && (
                                <span className="flex items-center gap-1 text-[10px] 2xl:text-xs text-violet-200">
                                    <span className="h-2 w-2 rounded-full bg-violet-300" />
                                    RSI 14
                                </span>
                            )}
                        </div>
                    )}
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

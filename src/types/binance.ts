// 바이낸스 Kline REST 응답 1행
export type KlineRow = [
    number, // 0: open time (ms)
    string, // 1: open
    string, // 2: high
    string, // 3: low
    string, // 4: close
    string, // 5: volume
    number, // 6: close time (ms)
    string, // 7: quote volume
    number, // 8: trades
    string, // 9: taker buy base vol
    string, // 10: taker buy quote vol
    string // 11: ignore
];

// 바이낸스 Kline WebSocket 메시지(필요 필드만)
export type Interval =
    | "1s"
    | "1m"
    | "3m"
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "2h"
    | "4h"
    | "6h"
    | "8h"
    | "12h"
    | "1d"
    | "3d"
    | "1w"
    | "1M";

export type KlineMessage = {
    e: "kline";
    E: number;
    s: string; // symbol
    k: {
        t: number; // start time (ms)
        T: number; // close time (ms)
        s: string; // symbol
        i: Interval;
        o: string;
        h: string;
        l: string;
        c: string;
        v: string; // base asset volume
        x: boolean; // is closed
    };
};

import type { UTCTimestamp } from "lightweight-charts";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function toIstUtcTimestamp(ms: number): UTCTimestamp {
    return Math.floor((ms + IST_OFFSET_MS) / 1000) as UTCTimestamp;
}

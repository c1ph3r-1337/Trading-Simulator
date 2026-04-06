"use client";

import { atom } from "jotai";
import type { MarginMode } from "@/types/sim-trading";

/**
 * 트리맵 오버레이 열림 상태
 * - 트리맵이 열려있으면 true, 닫혀있으면 false
 * - 다른 컴포넌트들은 이 상태를 참조하여 불필요한 폴링을 중단
 */
export const treemapOpenAtom = atom(false);

/* ── 모의투자 관련 atoms ── */

/** 현재 활성 페이지: 메인 대시보드 vs 모의투자 */
export const activePageAtom = atom<"main" | "sim">("main");

/** 모의투자에서 선택된 심볼 */
export const simSymbolAtom = atom("BTCUSDT");

/** 실시간 가격 캐시 { BTCUSDT: 98000.5, ... } */
export const simPricesAtom = atom<Record<string, number>>({});

/** 마진 모드 (Cross / Isolated) */
export const simMarginModeAtom = atom<MarginMode>("CROSS");

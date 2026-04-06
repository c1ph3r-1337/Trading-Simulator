let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    // suspended 상태면 resume (브라우저 정책)
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }
    return audioCtx;
}

/** 금속성 동전 타격음 — triangle + 비정수배 배음(inharmonic overtone)으로 메탈릭 질감 */
function coinHit(
    ctx: AudioContext,
    freq: number,
    start: number,
    dur: number,
    vol: number
) {
    // 메인 톤 (triangle = 금속 질감)
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = "triangle";
    osc1.frequency.value = freq;
    osc1.connect(g1);
    g1.connect(ctx.destination);
    g1.gain.setValueAtTime(vol, start);
    g1.gain.setValueAtTime(vol * 0.6, start + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc1.start(start);
    osc1.stop(start + dur);

    // 비정수배 배음 (금속이 비정수 하모닉을 가짐 → 찰랑 느낌)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = freq * 2.76;
    osc2.connect(g2);
    g2.connect(ctx.destination);
    g2.gain.setValueAtTime(vol * 0.35, start);
    g2.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.6);
    osc2.start(start);
    osc2.stop(start + dur);

    // 고역 쉬머 (동전 특유의 밝은 울림)
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.value = freq * 5.38;
    osc3.connect(g3);
    g3.connect(ctx.destination);
    g3.gain.setValueAtTime(vol * 0.15, start);
    g3.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.35);
    osc3.start(start);
    osc3.stop(start + dur);
}

/** 주문 체결 / 포지션 오픈 — 동전 2~3개 부딪히는 찰랑 소리 */
export function playOrderFilledSound() {
    try {
        const ctx = getCtx();
        const t = ctx.currentTime;
        coinHit(ctx, 2400, t, 0.35, 0.35);
        coinHit(ctx, 3200, t + 0.04, 0.3, 0.3);
        coinHit(ctx, 2800, t + 0.09, 0.4, 0.25);
    } catch {}
}

/** 포지션 종료 (수동/TP/SL) — 동전 여러 개 쏟아지는 찰랑찰랑 */
export function playPositionClosedSound() {
    try {
        const ctx = getCtx();
        const t = ctx.currentTime;
        coinHit(ctx, 2600, t, 0.3, 0.35);
        coinHit(ctx, 3400, t + 0.04, 0.25, 0.3);
        coinHit(ctx, 2200, t + 0.09, 0.35, 0.28);
        coinHit(ctx, 3800, t + 0.15, 0.3, 0.22);
        coinHit(ctx, 3000, t + 0.22, 0.4, 0.18);
    } catch {}
}

/** 강제 청산 — 무거운 금속음 + 경고 */
export function playLiquidationSound() {
    try {
        const ctx = getCtx();
        const t = ctx.currentTime;
        // 낮고 무거운 금속 타격
        coinHit(ctx, 800, t, 0.5, 0.4);
        coinHit(ctx, 600, t + 0.12, 0.5, 0.35);
        coinHit(ctx, 450, t + 0.28, 0.7, 0.3);
    } catch {}
}

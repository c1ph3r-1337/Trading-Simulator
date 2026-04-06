"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import type { User, AuthError } from "@supabase/supabase-js";

function mapAuthError(error: AuthError): string {
    const msg = (error.message || "").toLowerCase();

    // message 기반 매핑 (v2 SDK는 별도 code 필드가 없고 message/status 중심)
    if (msg.includes("user already registered") || msg.includes("already")) {
        return "This email is already registered.";
    }
    if (msg.includes("missing email")) {
        return "Enter an email address to sign up.";
    }
    if (
        msg.includes("weak password") ||
        msg.includes("password should be at least")
    ) {
        return "Password must be at least 6 characters.";
    }
    if (msg.includes("email not confirmed")) {
        return "Email confirmation is required. Check your inbox.";
    }
    if (msg.includes("invalid login credentials") || error.status === 400) {
        return "Invalid email or password.";
    }
    return error.message || "An unknown error occurred.";
}

export default function AuthBox({ isDark = true }: { isDark?: boolean }) {
    const [email, setE] = useState("");
    const [pw, setP] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    // 세션 초기화 + 구독 (익명 사용자 제외)
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            const u = data.user;
            setUser(u?.is_anonymous ? null : u ?? null);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            const u = session?.user;
            setUser(u?.is_anonymous ? null : u ?? null);
        });
        return () => sub.subscription.unsubscribe();
    }, []);

    const signUp = async () => {
        setErr(null);
        setInfo(null);

        const e = email.trim();
        const p = pw.trim();

        if (!e || !p) {
            setErr("Enter your email and password, then check your email inbox.");
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email: e,
            password: p,
        });
        setLoading(false);

        if (error) {
            setErr(mapAuthError(error));
            return;
        }

        // 이미 가입된 이메일 보정: identities가 빈 배열이면 기존 사용자
        const identities = data?.user?.identities;
        const already =
            !data?.user ||
            (Array.isArray(identities) && identities.length === 0);
        if (already) {
            setErr("This email is already registered.");
            return;
        }

        setInfo("Confirmation email sent. Check your inbox.");
    };

    const signIn = async () => {
        setErr(null);
        setInfo(null);

        const e = email.trim();
        const p = pw.trim();
        if (!e || !p) {
            setErr("Enter your email and password.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: e,
            password: p,
        });
        setLoading(false);

        if (error) {
            setErr(mapAuthError(error));
            return;
        }
        // 성공 시 onAuthStateChange로 user 상태 자동 반영
    };

    const signOut = async () => {
        setErr(null);
        setInfo(null);
        await supabase.auth.signOut();
        // 익명 로그인이 완료될 때까지 기다리기
        await new Promise(resolve => setTimeout(resolve, 500));
    };

    if (user) {
        return (
            <div className={`rounded-2xl border p-5 shadow-sm ${
                isDark
                    ? "border-neutral-700/50 bg-neutral-900"
                    : "border-neutral-200 bg-neutral-50"
            }`}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" className="text-emerald-500">
                            <path fill="currentColor" d="M12 2a5 5 0 1 1 0 10a5 5 0 0 1 0-10m0 12c5.33 0 8 2.67 8 6v2H4v-2c0-3.33 2.67-6 8-6" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-xs ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Signed in</p>
                        <p className={`text-sm font-medium truncate ${isDark ? "text-neutral-200" : "text-neutral-800"}`}>{user.email}</p>
                    </div>
                </div>
                <button
                    className={`w-full py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                        isDark
                            ? "text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border-neutral-700/50"
                            : "text-neutral-600 bg-white hover:bg-neutral-100 border-neutral-200"
                    }`}
                    onClick={signOut}
                >
                    Sign out
                </button>
            </div>
        );
    }

    return (
        <form
            className={`rounded-2xl border p-5 shadow-sm ${
                isDark
                    ? "border-neutral-700/50 bg-neutral-900"
                    : "border-neutral-200 bg-neutral-50"
            }`}
            onSubmit={(e) => {
                e.preventDefault();
                void signIn();
            }}
        >
            {/* 헤더 */}
            <div className="mb-5">
                <h3 className={`text-lg font-semibold ${isDark ? "text-neutral-200" : "text-neutral-800"}`}>Welcome</h3>
                <p className={`text-xs mt-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Sign in to your account or create a new one</p>
            </div>

            {/* 알림 메시지 */}
            {info && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-xs mb-4">
                    <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        {info}
                    </div>
                </div>
            )}
            {err && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-xs mb-4">
                    <div className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" className="shrink-0">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                        </svg>
                        {err}
                    </div>
                </div>
            )}

            {/* 입력 필드 */}
            <div className="space-y-3 mb-4">
                <div>
                    <label className={`block text-xs font-medium mb-1.5 ml-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Email</label>
                    <input
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                            isDark
                                ? "text-neutral-200 bg-neutral-800 border-neutral-700/50 placeholder:text-neutral-500"
                                : "text-neutral-800 bg-white border-neutral-200 placeholder:text-neutral-400"
                        }`}
                        placeholder="email@example.com"
                        value={email}
                        onChange={(e) => setE(e.target.value)}
                        autoComplete="email"
                        inputMode="email"
                    />
                </div>
                <div>
                    <label className={`block text-xs font-medium mb-1.5 ml-1 ${isDark ? "text-neutral-400" : "text-neutral-500"}`}>Password</label>
                    <input
                        className={`w-full px-4 py-2.5 text-sm rounded-xl border outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                            isDark
                                ? "text-neutral-200 bg-neutral-800 border-neutral-700/50 placeholder:text-neutral-500"
                                : "text-neutral-800 bg-white border-neutral-200 placeholder:text-neutral-400"
                        }`}
                        placeholder="••••••••"
                        type="password"
                        value={pw}
                        onChange={(e) => setP(e.target.value)}
                        autoComplete="current-password"
                    />
                </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 transition-colors cursor-pointer shadow-sm"
                >
                    {loading ? "Working..." : "Sign in"}
                </button>
                <button
                    type="button"
                    disabled={loading}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border disabled:opacity-60 transition-colors cursor-pointer ${
                        isDark
                            ? "text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border-neutral-700/50"
                            : "text-neutral-600 bg-white hover:bg-neutral-100 border-neutral-200"
                    }`}
                    onClick={() => void signUp()}
                >
                    {loading ? "Working..." : "Sign up"}
                </button>
            </div>

            {/* 안내 텍스트 */}
            <p className={`text-[10px] mt-4 text-center leading-relaxed ${isDark ? "text-neutral-500" : "text-neutral-400"}`}>
                Email confirmation is required for sign-up<br/>
                Check your spam folder too
            </p>
        </form>
    );
}

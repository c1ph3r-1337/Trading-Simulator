"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { ToastProvider } from "@/components/Toast";

function isMobileDevice(): boolean {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent;
    // User-Agent로만 모바일 기기 감지 (창 크기는 무시)
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // 모바일 감지 및 리다이렉트
    useEffect(() => {
        if (pathname === "/mobile") return; // 이미 모바일 페이지면 스킵

        if (isMobileDevice()) {
            router.replace("/mobile");
        }
    }, [pathname, router]);

    useEffect(() => {
        // 1) 최초 복원
        supabase.auth.getSession().then(() => setReady(true));

        // 2) 변경 구독
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            // 세션 변경시 자동 반영 (필요시 전역 상태 업데이트 추가)
        });

        return () => subscription.unsubscribe();
    }, []);

    if (!ready) return null;
    return (
        <ToastProvider>
            {children}
        </ToastProvider>
    );
}

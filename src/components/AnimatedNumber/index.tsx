"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    formatter?: (value: number) => string;
}

export default function AnimatedNumber({
    value,
    duration = 500,
    decimals = 0,
    prefix = "",
    suffix = "",
    className = "",
    formatter,
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const previousValue = useRef(value);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutExpo 이징
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = startValue + (endValue - startValue) * eased;
            setDisplayValue(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    const formattedValue = formatter
        ? formatter(displayValue)
        : displayValue.toFixed(decimals);

    return (
        <span className={`tabular-nums ${className}`}>
            {prefix}{formattedValue}{suffix}
        </span>
    );
}

// 가격 변동 하이라이트가 포함된 버전
interface AnimatedPriceProps {
    value: number;
    decimals?: number;
    prefix?: string;
    className?: string;
    formatter?: (value: number) => string;
}

export function AnimatedPrice({
    value,
    decimals = 2,
    prefix = "$",
    className = "",
    formatter,
}: AnimatedPriceProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [flash, setFlash] = useState<"up" | "down" | null>(null);
    const previousValue = useRef(value);
    const animationRef = useRef<number | null>(null);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            previousValue.current = value;
            setDisplayValue(value);
            return;
        }

        const startValue = previousValue.current;
        const endValue = value;

        // 가격 변동 방향 감지
        if (endValue > startValue) {
            setFlash("up");
        } else if (endValue < startValue) {
            setFlash("down");
        }

        // 플래시 효과 제거
        const flashTimer = setTimeout(() => setFlash(null), 300);

        const startTime = performance.now();
        const duration = 300;

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            const current = startValue + (endValue - startValue) * eased;
            setDisplayValue(current);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValue.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            clearTimeout(flashTimer);
        };
    }, [value]);

    const formattedValue = formatter
        ? formatter(displayValue)
        : displayValue.toLocaleString("en-US", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
          });

    return (
        <span
            className={`
                tabular-nums transition-colors duration-300
                ${flash === "up" ? "bg-emerald-500/20" : ""}
                ${flash === "down" ? "bg-red-500/20" : ""}
                ${className}
            `}
        >
            {prefix}{formattedValue}
        </span>
    );
}

"use client";
import { useEffect, useState } from "react";
import FearGreedGauge from "@/components/FearGreedGauge";

export default function FearGreedCard({ fadeDelay = 0 }: { fadeDelay?: number }) {
    const [val, setVal] = useState<number | null>(null);
    const [label, setLabel] = useState<string | undefined>(undefined);

    useEffect(() => {
        fetch("/api/fear-greed")
            .then((r) => r.json())
            .then((d) => {
                setVal(d.value);
                setLabel(d.label);
            })
            .catch(() => {
                setVal(50);
                setLabel("Neutral");
            });
    }, []);

    return (
        <FearGreedGauge
            value={val ?? 0}
            subLabel={label}
            isLoading={val == null}
            fadeDelay={fadeDelay}
        />
    );
}

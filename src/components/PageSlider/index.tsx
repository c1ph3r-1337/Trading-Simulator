"use client";

import { useAtomValue } from "jotai";
import { motion, AnimatePresence } from "framer-motion";
import { activePageAtom } from "@/store/atoms";
import dynamic from "next/dynamic";

const SimTradingPage = dynamic(
    () => import("@/components/SimTrading/SimTradingPage"),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-sm text-neutral-500 animate-pulse">
                    Loading paper trading...
                </div>
            </div>
        ),
    }
);

interface Props {
    children: React.ReactNode;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction > 0 ? "-100%" : "100%",
        opacity: 0,
    }),
};

export default function PageSlider({ children }: Props) {
    const activePage = useAtomValue(activePageAtom);
    const direction = activePage === "sim" ? 1 : -1;
    const isSim = activePage === "sim";

    return (
        <div className="relative overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
                {!isSim ? (
                    <motion.div
                        key="main"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "tween", duration: 0.3, ease: "easeInOut" },
                            opacity: { duration: 0.2 },
                        }}
                    >
                        {children}
                    </motion.div>
                ) : (
                    <motion.div
                        key="sim"
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "tween", duration: 0.3, ease: "easeInOut" },
                            opacity: { duration: 0.2 },
                        }}
                    >
                        <div className="px-5 bg-black min-w-[310px] pb-8">
                            <SimTradingPage />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

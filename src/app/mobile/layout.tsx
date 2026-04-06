import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mobile Notice",
    description: "This service is optimized for desktop. Use a PC browser for real-time liquidations, whale trades, treemaps, and crypto futures paper trading.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function MobileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}

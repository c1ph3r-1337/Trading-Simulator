import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthGate from "@/components/AuthGate";
import FloatingLoginSidebar from "@/components/FloatingLoginDrawer";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
    metadataBase: new URL(SITE),
    title: {
        default: "Liquidations · Whale Trades · Treemap · Paper Trading",
        template: "%s",
    },
    description:
        "Real-time Binance liquidations, whale trades, a 150-coin treemap, kimchi premium, fear and greed index, and crypto futures paper trading in one dashboard.",
    keywords: [
        "real-time liquidations",
        "whale trades",
        "crypto volume",
        "volume treemap",
        "kimchi premium",
        "fear and greed index",
        "crypto community",
        "crypto futures",
        "crypto news",
        "live chat",
        "bitcoin",
        "ethereum",
        "cryptocurrency",
        "binance",
        "upbit",
        "crypto prices",
        "bitcoin price",
        "paper trading",
        "futures simulator",
        "futures practice",
        "bitcoin paper trading",
        "leverage practice",
    ],
    alternates: { canonical: "/" },
    openGraph: {
        type: "website",
        url: SITE,
        title: "Liquidations · Whale Trades · Treemap · Paper Trading",
        siteName: "Trading Dashboard",
        description: "Track Binance liquidations, whale trades, a 150-coin treemap, kimchi premium, the fear and greed index, and crypto futures paper trading in one place.",
        images: [{ url: "/main-Image.png", width: 1200, height: 630, alt: "Real-time crypto dashboard" }],
        locale: "ko_KR",
    },
    twitter: {
        card: "summary_large_image",
        title: "Liquidations · Whale Trades · Treemap · Paper Trading",
        description: "Track Binance liquidations, whale trades, a 150-coin treemap, kimchi premium, the fear and greed index, and crypto futures paper trading in one place.",
        images: ["/main-Image.png"],
    },
    icons: { icon: "/favicon.png", apple: "/favicon-512.png" },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
        },
    },
    category: "finance",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`bg-black ${inter.variable}`} suppressHydrationWarning>
            <body>
                <AuthGate>{children}</AuthGate>
                <FloatingLoginSidebar />
            </body>
        </html>
    );
}

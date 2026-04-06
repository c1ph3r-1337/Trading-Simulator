import { RealTimeSection } from "@/components/RealTimeSection";
import { DashBoard } from "@/components/DashBorad";
import MobileSuggestModal from "@/components/MobileSuggestModa";
import Script from "next/script";
import ForceTabReturnReload from "@/components/ForceTabReturnReload";
import PageSlider from "@/components/PageSlider";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const ORG_JSONLD = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Trading Dashboard",
    url: SITE,
    logo: `${SITE}/favicon-512.png`,
    description: "A trading dashboard with real-time crypto liquidations, whale trades, treemap analytics, and crypto futures paper trading.",
    sameAs: [],
    contactPoint: [
        {
            "@type": "ContactPoint",
            contactType: "customer support",
            availableLanguage: ["ko", "en"],
        },
    ],
};

const SITE_JSONLD = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE,
    name: "Trading Dashboard",
    description: "Real-time Binance liquidations, whale trades, a 150-coin treemap, kimchi premium, the fear and greed index, and crypto futures paper trading in one dashboard.",
    inLanguage: "ko",
    potentialAction: {
        "@type": "SearchAction",
        target: `${SITE}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
    },
};

const APP_JSONLD = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Trading Dashboard",
    url: SITE,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web Browser",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
    },
    featureList: [
        "Real-time liquidation alerts",
        "Whale trade tracking",
        "150-coin treemap",
        "Kimchi premium calculation",
        "Fear and greed index",
        "Live chat",
        "Crypto news",
        "Crypto futures paper trading",
        "Leverage simulation",
        "Long and short position practice",
    ],
};

const FAQ_JSONLD = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "Is this service free?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. All core features are available for free, including real-time liquidations, whale trades, the treemap, kimchi premium, and crypto futures paper trading.",
            },
        },
        {
            "@type": "Question",
            name: "What is the kimchi premium?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "The kimchi premium measures the price difference between Korean exchanges such as Upbit and offshore exchanges such as Binance. A positive value means Korea is trading higher, and a negative value means offshore markets are higher.",
            },
        },
        {
            "@type": "Question",
            name: "How is the fear and greed index calculated?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "The fear and greed index combines volatility, trading volume, and social trend signals into a score from 0 to 100. Lower values indicate fear, and higher values indicate greed.",
            },
        },
        {
            "@type": "Question",
            name: "What can I see in the treemap?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "The treemap visualizes more than 150 cryptocurrencies by trading volume. Box size represents volume, and color represents price change.",
            },
        },
        {
            "@type": "Question",
            name: "How do I use crypto futures paper trading?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Crypto futures paper trading lets you practice with 10,000 USDT in virtual capital using live Binance prices. It supports long and short positions, leverage up to 125x, limit, market, and stop orders, take-profit and stop-loss settings, and cross or isolated margin modes.",
            },
        },
    ],
};

export default function Home() {
    return (
        <>
            <Script
                id="ld-org"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(ORG_JSONLD)}
            </Script>
            <Script
                id="ld-site"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(SITE_JSONLD)}
            </Script>
            <Script
                id="ld-app"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(APP_JSONLD)}
            </Script>
            <Script
                id="ld-faq"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(FAQ_JSONLD)}
            </Script>

            <PageSlider>
                <main className="flex flex-col px-5 bg-black min-w-310">
                    <RealTimeSection />
                    <DashBoard />
                </main>
            </PageSlider>
            <MobileSuggestModal />
            <ForceTabReturnReload />
        </>
    );
}

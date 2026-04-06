"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SeoFooter() {
    const [isLight, setIsLight] = useState(true);

    useEffect(() => {
        const html = document.documentElement;
        setIsLight(html.classList.contains("light"));

        const observer = new MutationObserver(() => {
            setIsLight(html.classList.contains("light"));
        });
        observer.observe(html, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    }, []);

    return (
        <section
            aria-labelledby="seo-footer-heading"
            className="border-t border-zinc-800 mt-5"
        >
            <div className="mx-auto w-full max-w-screen-xl px-5 py-8 text-zinc-300 ">
                <Image
                    src={isLight ? "/favicon-light.png" : "/favicon.png"}
                    alt="Dashboard logo"
                    width={80}
                    height={80}
                    className="ml-[-18px]"
                />
                <h2
                    id="seo-footer-heading"
                    className="text-base md:text-xl font-semibold text-white"
                >
                    All-in-one dashboard for crypto traders
                    <br></br>Treemap, real-time liquidations, whale trades, and paper trading in one view
                </h2>
                <p className="mt-5  text-sm md:text-base">
                    This service is a unified dashboard for crypto traders.
                    <br />
                    <strong className="font-medium">
                        150-coin volume treemap
                    </strong>
                    lets you scan the market at a glance, alongside
                    <strong className="font-medium"> real-time liquidations</strong>,
                    <strong className="font-medium"> whale trades</strong>,
                    kimchi premium, the fear and greed index, news, live chat, and crypto futures
                    paper trading.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <article className="rounded-xl bg-zinc-900/60 p-7 ring-1 ring-zinc-800">
                        <h3 className="text-sm font-semibold text-white">
                            Real-time Liquidations · Whale Trades
                        </h3>
                        <p className="mt-2 text-sm">
                            Track Binance futures liquidations and whale trades above $50K in real time to read market flow.
                        </p>
                        <div className="mt-3"></div>
                    </article>

                    <article className="rounded-xl bg-zinc-900/60 p-7 ring-1 ring-zinc-800">
                        <h3 className="text-sm font-semibold text-white">
                            Treemap · Kimchi · Fear & Greed
                        </h3>
                        <p className="mt-2 text-sm">
                            Use a 150-coin volume treemap, kimchi premium, and the fear and greed index to gauge market sentiment.
                        </p>
                        <div className="mt-3 space-x-3"></div>
                    </article>
                    <article className="rounded-xl bg-zinc-900/60 p-7 ring-1 ring-zinc-800">
                        <h3 className="text-sm font-semibold text-white">
                            Crypto Futures Paper Trading
                        </h3>
                        <p className="mt-2 text-sm">
                            Practice long and short futures positions with live Binance prices, up to 125x leverage, TP/SL, and cross or isolated margin.
                        </p>
                        <div className="mt-3"></div>
                    </article>

                    <article className="rounded-xl bg-zinc-900/60 p-7 ring-1 ring-zinc-800">
                        <h3 className="text-sm font-semibold text-white">
                            Notes
                        </h3>
                        <p className="mt-2 text-sm">
                            External affiliate links, promotional copy, and personal contact details were removed so the app focuses on market data and paper trading.
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                            Manage operational links and contact details through internal settings or a separate admin page.
                        </p>
                    </article>
                </div>

                <p className="mt-8 text-xs text-zinc-500">
                    A crypto trader dashboard that brings together real-time liquidations, whale trades, treemap analytics, kimchi premium, fear and greed, news, chat, and crypto futures paper trading.
                </p>
            </div>
        </section>
    );
}

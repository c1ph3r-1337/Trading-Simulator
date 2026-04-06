import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNewsById } from "@/lib/news";
import Script from "next/script";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const news = await getNewsById(id);

    if (!news) {
        return {
            title: "News not found",
        };
    }

    const description = news.title.slice(0, 160);

    return {
        title: news.title,
        description,
        keywords: [
            ...(news.symbols || []),
            "crypto news",
            "cryptocurrency news",
            news.source,
        ],
        openGraph: {
            type: "article",
            title: news.title,
            description,
            publishedTime: news.published_at,
            url: `/news/${id}`,
            siteName: "Trading Dashboard",
            images: [
                {
                    url: "/og.png",
                    width: 1200,
                    height: 630,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: news.title,
            description,
        },
        alternates: {
            canonical: `/news/${id}`,
        },
    };
}

export default async function NewsDetailPage({ params }: Props) {
    const { id } = await params;
    const news = await getNewsById(id);

    if (!news) {
        notFound();
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: news.title,
        datePublished: news.published_at,
        author: {
            "@type": "Organization",
            name: news.source,
        },
        publisher: {
            "@type": "Organization",
            name: "Trading Dashboard",
            logo: {
                "@type": "ImageObject",
                url: `${siteUrl}/favicon.png`,
            },
        },
        description: news.title,
        url: `${siteUrl}/news/${id}`,
    };

    return (
        <>
            <Script
                id="article-jsonld"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(articleJsonLd)}
            </Script>

            <article className="max-w-4xl mx-auto px-5 py-8 bg-black min-h-screen">
                <header className="mb-6">
                    <div className="text-sm text-neutral-400 mb-2">
                        {news.source} ·{" "}
                        {new Date(news.published_at).toLocaleDateString(
                            "ko-KR"
                        )}
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-4">
                        {news.title}
                    </h1>
                    {news.symbols && news.symbols.length > 0 && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {news.symbols.map((symbol) => (
                                <span
                                    key={symbol}
                                    className="px-3 py-1 bg-neutral-800 text-neutral-200 rounded-full text-sm"
                                >
                                    {symbol}
                                </span>
                            ))}
                        </div>
                    )}
                </header>

                <div className="mt-8 p-4 bg-neutral-900 rounded-lg border border-neutral-800">
                    <p className="text-sm text-neutral-400 mb-3">Original article</p>
                    <a
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:underline break-all"
                    >
                        {news.url}
                    </a>
                </div>
            </article>
        </>
    );
}

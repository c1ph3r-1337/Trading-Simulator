import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostById } from "@/lib/posts";
import Script from "next/script";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
        return { title: "Post not found" };
    }

    const description = post.body.slice(0, 160);

    return {
        title: post.title,
        description,
        keywords: ["crypto community", "futures trading", "trading", post.title],
        openGraph: {
            type: "article",
            title: post.title,
            description,
            publishedTime: post.created_at,
            url: `/posts/${id}`,
            siteName: "Trading Dashboard",
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description,
        },
        alternates: {
            canonical: `/posts/${id}`,
        },
    };
}

export default async function PostDetailPage({ params }: Props) {
    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
        notFound();
    }

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "DiscussionForumPosting",
        headline: post.title,
        text: post.body,
        datePublished: post.created_at,
        publisher: {
            "@type": "Organization",
            name: "Trading Dashboard",
        },
    };

    return (
        <>
            <Script
                id="post-jsonld"
                type="application/ld+json"
                strategy="afterInteractive"
            >
                {JSON.stringify(articleJsonLd)}
            </Script>

            <article className="max-w-4xl mx-auto px-5 py-8 bg-black min-h-screen">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-white mb-4">
                        {post.title}
                    </h1>
                    <time className="text-sm text-neutral-400">
                        {new Date(post.created_at).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        })}
                    </time>
                </header>
                <div className="prose prose-invert max-w-none">
                    <p className="text-neutral-200 whitespace-pre-wrap">
                        {post.body}
                    </p>
                </div>
            </article>
        </>
    );
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/mobile"],
            },
            {
                userAgent: "Googlebot",
                allow: "/",
                disallow: ["/api/", "/mobile"],
                crawlDelay: 0,
            },
            {
                userAgent: "Bingbot",
                allow: "/",
                disallow: ["/api/", "/mobile"],
                crawlDelay: 1,
            },
            {
                userAgent: "Yeti",
                allow: "/",
                disallow: ["/api/", "/mobile"],
                crawlDelay: 1,
            },
        ],
        sitemap: `${base}/sitemap.xml`,
        host: base,
    };
}

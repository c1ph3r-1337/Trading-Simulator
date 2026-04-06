import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "assets.coincap.io",
                pathname: "/assets/icons/**",
            },
        ],
        formats: ["image/avif", "image/webp"],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    // 번들 최적화
    experimental: {
        optimizePackageImports: ["framer-motion", "lightweight-charts"],
    },
    // 압축 활성화
    compress: true,
    // 프로덕션 소스맵 비활성화 (번들 크기 감소)
    productionBrowserSourceMaps: false,
    // 보안 헤더
    async headers() {
        return [
            {
                source: "/:path*",
                headers: [
                    {
                        key: "X-DNS-Prefetch-Control",
                        value: "on",
                    },
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "origin-when-cross-origin",
                    },
                    {
                        key: "X-Frame-Options",
                        value: "SAMEORIGIN",
                    },
                    {
                        key: "X-XSS-Protection",
                        value: "1; mode=block",
                    },
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=31536000; includeSubDomains",
                    },
                    {
                        key: "Permissions-Policy",
                        value: "camera=(), microphone=(), geolocation=()",
                    },
                ],
            },
            // API 캐시 헤더
            {
                source: "/api/fear-greed",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, s-maxage=300, stale-while-revalidate=600",
                    },
                ],
            },
            {
                source: "/api/market-indices",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "public, s-maxage=30, stale-while-revalidate=60",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;

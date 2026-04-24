import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://t.poly.rpi.edu";

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy,
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
];

// Looser header set for Payload admin (mounted at /newsroom, legacy /admin redirects there).
// The admin UI relies on inline styles/scripts and blob workers; we skip CSP entirely there
// but keep the other protective headers.
const adminSecurityHeaders = securityHeaders.filter(
  (h) => h.key !== 'Content-Security-Policy' && h.key !== 'Cross-Origin-Resource-Policy',
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: [],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: '/admin/:path*',
        destination: '/newsroom/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogHost}/static/:path*`,
      },
      {
        source: "/ingest/:path*",
        destination: `${posthogHost}/:path*`,
      },
    ];
  },
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'http',
        hostname: '10.10.10.22',
        port: '8080',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/((?!api|admin|newsroom|_next/static|_next/image).*)\\.(svg|png|jpg|jpeg|webp|avif|ico|ttf|otf|woff|woff2)$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Relaxed headers for the Payload admin UI (mounted at /newsroom) and the
      // legacy /admin path (which redirects to /newsroom). CSP is omitted here
      // because the admin UI uses inline scripts/styles and blob workers that
      // would require a long allowlist to function correctly.
      {
        source: '/newsroom/:path*',
        headers: adminSecurityHeaders,
      },
      {
        source: '/admin/:path*',
        headers: adminSecurityHeaders,
      },
      // Strict security headers for everything else. The negative lookahead
      // keeps the admin routes on the relaxed set above.
      {
        source: '/((?!newsroom|admin).*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withPayload(nextConfig);

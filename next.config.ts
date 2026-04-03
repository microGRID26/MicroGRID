import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co https://unpkg.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://exp.host https://api.anthropic.com; frame-ancestors 'none'" },
      ],
    }]
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses Sentry SDK build logs
  silent: true,
  // Disable source map upload until Sentry org/project/auth token are configured
  sourcemaps: {
    disable: true,
  },
});

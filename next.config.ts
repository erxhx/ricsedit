import type { NextConfig } from "next";

// Content-Security-Policy. Allowlists the third parties the site actually
// loads: Square (payment SDK, card iframe, tokenization endpoints), Google
// Fonts, Google Analytics/Tag Manager/Ads, and the Google Maps embed.
// 'unsafe-inline'/'unsafe-eval' are kept for the GA/GTM inline snippets and
// the Square SDK — so CSP here is origin-allowlisting + anti-framing defence
// in depth, layered on top of the app's own HTML escaping, not the primary
// XSS control.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.squarecdn.com https://www.googletagmanager.com https://www.google-analytics.com https://googleads.g.doubleclick.net https://www.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.squarecdn.com",
  "font-src 'self' data: https://fonts.gstatic.com https://*.squarecdn.com https://d1g145x70srn7h.cloudfront.net",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.squarecdn.com https://pci-connect.squareup.com https://pci-connect.squareupsandbox.com https://connect.squareup.com https://connect.squareupsandbox.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://*.google.com",
  "frame-src 'self' https://*.squarecdn.com https://connect.squareup.com https://connect.squareupsandbox.com https://www.google.com https://td.doubleclick.net",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://connect.squareup.com" "https://connect.squareupsandbox.com")' },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.*'],
  turbopack: {
    root: __dirname,
  },
  // Ensure the HTML source files are bundled into the serverless function
  outputFileTracingIncludes: {
    '/':          ['./editstudio.space/index.html'],
    '/[...slug]': ['./editstudio.space/index.html'],
    '/privacy':   ['./editstudio.space/privacy.html'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

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
};

export default nextConfig;

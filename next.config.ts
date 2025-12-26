import type { NextConfig } from "next";

// Allowed origins for CORS - restrictive by default
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.NEXT_PUBLIC_ALLOWED_ORIGINS || 'https://nutrikallpa.com').split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            // In production, use specific origin; in dev, allow localhost
            value: ALLOWED_ORIGINS[0],
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Max-Age",
            value: "86400",
          },
          {
            key: "X-Frame-Options",
            // Restrictive: only allow same origin framing
            value: "SAMEORIGIN",
          },
          {
            key: "Content-Security-Policy",
            // Restrictive CSP for production
            value: process.env.NODE_ENV === 'production'
              ? "frame-ancestors 'self'"
              : "frame-ancestors 'self' *",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        hostname: "images.pexels.com",
      },
      {
        hostname: "images.unsplash.com",
      },
      {
        hostname: "chat2db-cdn.oss-us-west-1.aliyuncs.com",
      },
      {
        hostname: "cdn.chat2db-ai.com",
      },
      {
        hostname: "lh3.googleusercontent.com",
      }
    ],
  },
};

export default nextConfig;

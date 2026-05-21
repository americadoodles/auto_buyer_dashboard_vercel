/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  async rewrites() {
    // Use `afterFiles` so Next.js route handlers (e.g. /api/agents) win when present,
    // and only requests that don't match a local handler fall through to the Python backend.
    const proxyToPython = (() => {
      if (process.env.NODE_ENV === "development") {
        return [{ source: "/api/:path*", destination: "http://127.0.0.1:8001/api/:path*" }];
      }
      if (process.env.NEXT_PUBLIC_API_URL) {
        return [{ source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` }];
      }
      // On Vercel, let the platform route `/api/*` to the Python function directly.
      return [];
    })();
    return {
      beforeFiles: [],
      afterFiles: proxyToPython,
      fallback: [],
    };
  },
};
module.exports = nextConfig;

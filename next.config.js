/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.STANDALONE === "true" ? "standalone" : undefined,
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        { source: "/api/:path*", destination: "http://127.0.0.1:8001/api/:path*" },
      ];
    }
    // In production on GCP, proxy /api/* to the backend Cloud Run service
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [
        { source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` },
      ];
    }
    // On Vercel, let it route `/api/*` to the Python function directly
    return [];
  },
};
module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        { source: "/api/:path*", destination: "http://127.0.0.1:8001/api/:path*" },
      ];
    }
    // In production, let Vercel route `/api/*` to your Python function directly
    return [];
  },
};
module.exports = nextConfig;

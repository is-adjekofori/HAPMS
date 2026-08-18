import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server bundle (.next/standalone) for
  // the Docker image, instead of requiring the full node_modules tree.
  output: "standalone",

  async rewrites() {
    return [
      {
        // Matches any request starting with /api/
        source: "/api/:path*",
        // Proxies it internally to FastAPI running on port 8000
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;

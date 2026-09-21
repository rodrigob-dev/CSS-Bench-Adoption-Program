import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/map", destination: "/", permanent: true }];
  },
  /* config options here */
};

export default nextConfig;

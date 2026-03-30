import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  instrumentationHook: true as any,
  productionBrowserSourceMaps: true,
  swcMinify: false,
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.devtool = "source-map";
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

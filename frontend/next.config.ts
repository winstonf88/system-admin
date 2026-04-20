import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1 MB; product images sent as data URLs exceed that easily.
      bodySizeLimit: "25mb",
    },
    // With middleware (or proxy), Next buffers the body for replay; default is 10 MB.
    // Must be >= server action payload + multipart overhead or parsing fails ("Unexpected end of form").
    proxyClientMaxBodySize: "25mb",
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;

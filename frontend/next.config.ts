import os from "node:os";
import type { NextConfig } from "next";

/**
 * In dev, Next.js blocks some `/_next/*` requests unless the request `Origin`
 * hostname is allowlisted. Opening the app via a LAN IP (e.g. http://192.168.0.228:3000)
 * sends `Origin` with that IP, which is not the same as bind host `0.0.0.0` (`-H 0.0.0.0`),
 * so client chunks can 403 and the app never hydrates (no `POST /api/auth/login` in Network).
 *
 * - `NEXT_ALLOWED_DEV_ORIGIN_HOSTS`: comma-separated hostnames or origins (for Docker / VPN
 *   where this machine’s IPs differ from the URL the browser uses).
 * - When the CLI is `next dev`, non-internal IPv4s from `os.networkInterfaces()` are added
 *   automatically so LAN access works without an env file.
 */
function allowedDevOriginsFromEnv(): string[] {
  const raw = process.env.NEXT_ALLOWED_DEV_ORIGIN_HOSTS ?? "";
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (!t) continue;
    try {
      out.push(t.includes("://") ? new URL(t).hostname : t);
    } catch {
      out.push(t);
    }
  }
  return out;
}

function isIpv4NonInternal(addr: os.NetworkInterfaceInfo): boolean {
  if (addr.internal) return false;
  return addr.family === "IPv4" || addr.family === 4;
}

/** Hostnames the browser may send on `Origin` when you open dev over LAN. */
function localLanIpv4Hostnames(): string[] {
  const hosts = new Set<string>();
  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (!isIpv4NonInternal(a) || !a.address) continue;
      hosts.add(a.address);
    }
  }
  return [...hosts];
}

const isNextDevCli = process.argv.some((arg) => arg === "dev");

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...allowedDevOriginsFromEnv(),
    ...(isNextDevCli ? localLanIpv4Hostnames() : []),
  ],
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

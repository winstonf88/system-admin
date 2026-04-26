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
      // Next expects host-style entries, and preserving an explicit port matters.
      out.push(t.includes("://") ? new URL(t).host : t);
    } catch {
      out.push(t);
    }
  }
  return out;
}

function isIpv4NonInternal(addr: os.NetworkInterfaceInfo): boolean {
  if (addr.internal) return false;
  return addr.family === "IPv4";
}

/** Host entries the browser may send on `Origin` when opening dev over LAN. */
function localLanIpv4Hosts(port: number): string[] {
  const hosts = new Set<string>();
  try {
    for (const addrs of Object.values(os.networkInterfaces())) {
      if (!addrs) continue;
      for (const a of addrs) {
        if (!isIpv4NonInternal(a) || !a.address) continue;
        hosts.add(a.address);
        hosts.add(`${a.address}:${port}`);
      }
    }
  } catch {
    // Some environments can fail to enumerate network interfaces; keep static fallbacks.
  }
  return [...hosts];
}

const devPort = Number(process.env.PORT ?? "3000");
const staticDevOriginHosts = [
  "localhost",
  `localhost:${devPort}`,
  "127.0.0.1",
  `127.0.0.1:${devPort}`,
  // Current LAN host explicitly added to avoid HMR origin blocking.
  "192.168.0.228",
  "192.168.0.228:3000",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...staticDevOriginHosts,
    ...allowedDevOriginsFromEnv(),
    ...localLanIpv4Hosts(devPort),
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

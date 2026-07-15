import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project. Without this, Turbopack
  // auto-detects root by walking up for the nearest lockfile — a stray
  // ~/package-lock.js made it treat the home dir as root, which broke
  // `[project]/...` module resolution (e.g. the instrumentation hook).
  turbopack: { root: process.cwd() },
};

export default nextConfig;

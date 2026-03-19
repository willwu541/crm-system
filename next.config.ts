import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "52mb",
  },
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;

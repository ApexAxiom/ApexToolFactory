import { createSecureHeaders } from "./src/lib/security-headers";

const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: createSecureHeaders(),
      },
    ];
  },
};

export default nextConfig;

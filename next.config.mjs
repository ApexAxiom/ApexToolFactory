function createSecureHeaders() {
  return [
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Content-Security-Policy",
      value:
        "default-src 'self'; img-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
    },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  ];
}

const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Ignore ESLint errors during builds (CI/Amplify)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TS type errors during builds (CI/Amplify)
    ignoreBuildErrors: true,
  },
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

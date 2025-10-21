/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true } // lint won't block deploys
};

module.exports = nextConfig;

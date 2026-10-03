/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
  },
};
export default nextConfig;

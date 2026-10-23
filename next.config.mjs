/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["sharp"],
    outputFileTracingIncludes: {
      "/api/cards/[id]/artwork": ["./public/fonts/**/*"],
    },
  },
};
export default nextConfig;

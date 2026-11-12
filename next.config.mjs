
const artworkAssets = [
  "./lib/artwork/assets/fonts/**/*",
  "./public/fonts/**/*",
  "./public/templates/**/*",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["sharp", "opentype.js"],
    outputFileTracingIncludes: {
      "/api/cards/[id]/artwork": artworkAssets,
      "/api/cards/[id]/send": artworkAssets,
      "/api/campaigns/preview": artworkAssets,
      "/api/cron/campaign-mailings": artworkAssets,
    },
  },
};
export default nextConfig;

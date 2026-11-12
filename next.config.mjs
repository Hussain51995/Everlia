const artworkAssets = [
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
      "/api/**/*": artworkAssets,
      "/api/cards/**/*": artworkAssets,
      "/api/campaigns/**/*": artworkAssets,
      "/api/cron/**/*": artworkAssets,
    },
  },
};
export default nextConfig;

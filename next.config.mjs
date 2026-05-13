import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development", // Keeps development fast, activates in production
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {}, // This silences the Turbopack/Webpack clash!
};

export default withPWA(nextConfig);
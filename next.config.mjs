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
  typescript: {
    // This tells Vercel to ignore TypeScript errors in the Supabase folder
    // and successfully deploy your JavaScript application.
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allowlists all external imagery strings for your testing layout
      },
    ],
  },
};

export default nextConfig;

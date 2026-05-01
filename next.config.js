/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "pdfkit"],
  },
};

module.exports = nextConfig;

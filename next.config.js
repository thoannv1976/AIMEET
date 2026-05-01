const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "pdfkit"],
  },
  // Belt-and-suspenders: also register the @/* alias at the webpack level
  // so resolution works under buildpacks that may not pick up tsconfig paths.
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

module.exports = nextConfig;

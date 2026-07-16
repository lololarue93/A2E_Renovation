/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: false
  },
  images: {
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  serverExternalPackages: ['sharp', 'puppeteer-core'],
}
export default nextConfig

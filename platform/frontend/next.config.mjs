/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL ?? 'http://backend:4000';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

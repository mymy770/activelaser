import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'activegamesworld.com',
      },
    ],
  },
}

export default nextConfig

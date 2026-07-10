import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_TARGET ?? 'http://localhost:3000'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig

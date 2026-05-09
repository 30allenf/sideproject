import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config) {
    // Enable WASM for Stockfish
    config.experiments = { ...config.experiments, asyncWebAssembly: true }

    // Suppress chessground browser-only warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }

    return config
  },
  async headers() {
    return [
      {
        // Required for SharedArrayBuffer used by Stockfish WASM
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy',  value: 'require-corp' },
        ],
      },
    ]
  },
}

export default nextConfig

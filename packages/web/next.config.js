/** @type {import('next').NextConfig} */
const dotenv = require('dotenv')
const path = require('path')
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const nextConfig = {
  // 启用sourcemap用于开发和生产环境调试
  productionBrowserSourceMaps: true,

  // 服务器配置
  serverRuntimeConfig: {
    port: process.env.WEB_PORT || 3000,
  },

  // 开发环境配置
  webpack: (config, { dev, isServer }) => {
    // 在开发环境启用sourcemap
    if (dev) {
      config.devtool = 'eval-source-map'
    }

    return config
  },

  // 环境变量配置
  env: {
    SERVER_URL: process.env.SERVER_URL || `http://localhost:${process.env.SERVER_PORT || 3001}`,
    WEB_PORT: process.env.WEB_PORT || 3000,
  },

  // 路由重定向配置
  async redirects() {
    return [
      {
        source: '/videos',
        destination: '/editor',
        permanent: true,
      },
      {
        source: '/upload',
        destination: '/editor',
        permanent: true,
      }
    ]
  },
}

module.exports = nextConfig 
import { createApp } from './app'
import { logger } from './utils/logger'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    const app = createApp()

    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`)
      logger.info(`📋 API Documentation: http://localhost:${PORT}/api`)
      logger.info(`🎯 Health Check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully...')
  process.exit(0)
})

startServer() 
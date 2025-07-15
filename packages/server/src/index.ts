import * as dotenv from 'dotenv'
import * as path from 'path'
import { createApp } from './app'
import { logger } from './utils/logger'

// 加载环境变量，从项目根目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

const PORT = process.env.SERVER_PORT || 3001

async function startServer() {
  try {
    const app = createApp()

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`)
      logger.info(`📋 API documentation: http://localhost:${PORT}/api`)
      logger.info(`💚 Health check: http://localhost:${PORT}/health`)
    })

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully...')
      server.close(() => {
        logger.info('Server closed')
        process.exit(0)
      })
    })

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully...')
      server.close(() => {
        logger.info('Server closed')
        process.exit(0)
      })
    })

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer() 
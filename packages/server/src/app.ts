import express from 'express'
import cors from 'cors'
import { logger } from './utils/logger'
import apiRoutes from './routes'
import { getYouTubeUploader } from './uploader'

export function createApp(): express.Application {
  const app = express()

  // 中间件
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }))

  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // 请求日志中间件
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`)
    next()
  })

  app.get('/auth', (req, res) => {
    try {

      const youtubeUploader = getYouTubeUploader()
      if (youtubeUploader.authUrl) {
        res.redirect(youtubeUploader.authUrl)
      } else {
        res.status(400).json({
          success: false,
          error: 'YouTube授权失败'
        })
      }
    } catch (err) {
      logger.error('auth error', err)
    }
  })

  app.get('/oauth2callback', async (req, res) => {
    try {
      const { code } = req.query
      if (code) {
        const youtubeUploader = getYouTubeUploader()
        await youtubeUploader.getTokensFromCode(code as string)
        res.redirect('http://localhost:3000/editor')
      }
    } catch (err) {
      logger.error('auth callback error', err)
    }
  })

  // 健康检查路由
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    })
  })

  // API 文档路由
  app.get('/api', (req, res) => {
    res.json({
      name: '抖音搬运助手 API (简化版)',
      version: '2.0.0',
      description: '三步流程：下载 → 翻译标题 → 上传YouTube',
      endpoints: {
        'GET /api/videos': '获取所有视频列表',
        'GET /api/videos/:id': '获取单个视频信息',
        'POST /api/download': '下载抖音视频',
        'POST /api/videos/:id/translate': '翻译视频标题和描述',
        'POST /api/videos/:id/upload': '上传到YouTube',
        'GET /api/youtube/auth-url': '获取YouTube授权URL',
        'GET /api/youtube/callback': 'YouTube授权回调',
        'GET /api/youtube/auth-status': '检查YouTube授权状态',
        'GET /health': '健康检查'
      }
    })
  })

  // API 路由
  app.use('/api', apiRoutes)

  // 错误处理中间件
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('API Error:', err)
    res.status(500).json({
      success: false,
      error: err.message || '服务器内部错误'
    })
  })

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: `Path ${req.path} not found`,
      timestamp: new Date().toISOString()
    })
  })

  logger.info('✅ Express application created successfully')

  return app
} 
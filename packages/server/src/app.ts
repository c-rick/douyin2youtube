import Koa from 'koa'
import cors from '@koa/cors'
import bodyParser from 'koa-bodyparser'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/requestLogger'
import { apiRouter } from './routes'
export function createApp(): Koa {
  const app = new Koa()

  // 错误处理中间件（最先执行）
  app.use(errorHandler)

  // 请求日志中间件
  app.use(requestLogger)

  // CORS 配置
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept']
  }))

  // 请求体解析
  app.use(bodyParser({
    jsonLimit: '10mb',
    textLimit: '10mb',
    formLimit: '10mb'
  }))

  // 健康检查路由
  app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      ctx.body = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
      return
    }
    await next()
  })

  // API 文档路由
  app.use(async (ctx, next) => {
    if (ctx.path === '/api') {
      ctx.body = {
        name: '抖音翻译搬运助手 API',
        version: '1.0.0',
        endpoints: {
          'POST /api/crawler/start': '开始爬取视频（支持任务ID跟踪）',
          'GET /api/crawler/list': '获取视频列表',
          'GET /api/crawler/status/:taskId': '获取爬取任务状态',
          'GET /api/crawler/tasks': '获取所有爬取任务',
          'POST /api/process/:id': '开始处理视频',
          'GET /api/status/:id': '查询视频处理状态',
          'POST /api/upload/:id': '上传到 YouTube',
          'GET /health': '健康检查'
        }
      }
      return
    }
    await next()
  })

  // API 路由
  app.use(apiRouter.routes())
  app.use(apiRouter.allowedMethods())

  // 404 处理
  app.use(async (ctx) => {
    ctx.status = 404
    ctx.body = {
      error: 'Not Found',
      message: `Path ${ctx.path} not found`,
      timestamp: new Date().toISOString()
    }
  })

  logger.info('✅ Koa application created successfully')

  return app
} 
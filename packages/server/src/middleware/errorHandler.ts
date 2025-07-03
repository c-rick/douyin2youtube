import { Context, Next } from 'koa'
import { logger } from '../utils/logger'

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next()
  } catch (error: any) {
    // 记录错误日志
    logger.error('Request error:', {
      path: ctx.path,
      method: ctx.method,
      query: ctx.query,
      body: ctx.request.body,
      error: error.message,
      stack: error.stack
    })

    // 设置响应状态和内容
    ctx.status = error.status || error.statusCode || 500

    // 开发环境返回详细错误信息
    if (process.env.NODE_ENV === 'development') {
      ctx.body = {
        error: error.message || 'Internal Server Error',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        path: ctx.path,
        method: ctx.method
      }
    } else {
      // 生产环境返回简化错误信息
      const isClientError = ctx.status < 500
      ctx.body = {
        error: isClientError ? error.message : 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: ctx.path
      }
    }

    // 确保响应是 JSON 格式
    ctx.type = 'application/json'
  }
} 
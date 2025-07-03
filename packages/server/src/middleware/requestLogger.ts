import { Context, Next } from 'koa'
import { logger } from '../utils/logger'

export async function requestLogger(ctx: Context, next: Next) {
  const start = Date.now()

  // 记录请求开始
  logger.info(`→ ${ctx.method} ${ctx.path}`, {
    query: ctx.query,
    userAgent: ctx.headers['user-agent'],
    ip: ctx.ip
  })

  await next()

  // 计算响应时间
  const responseTime = Date.now() - start

  // 记录请求完成
  const logLevel = ctx.status >= 400 ? 'error' : 'info'
  logger[logLevel](`← ${ctx.method} ${ctx.path} ${ctx.status} ${responseTime}ms`, {
    status: ctx.status,
    responseTime: `${responseTime}ms`,
    contentLength: ctx.response.length || 0
  })
} 
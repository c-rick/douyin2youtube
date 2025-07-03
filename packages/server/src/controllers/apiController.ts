import { Context } from 'koa'
import { logger } from '../utils/logger'
import { crawlerService } from '../services/crawlerService'
import { storageService } from '../services/storageService'
import { queueService } from '../services/queueService'
import { taskService } from '../services/taskService'
import {
  ApiResponse,
  CrawlerStartRequest,
  ProcessVideoRequest,
  UploadVideoRequest,
  CrawlingTask
} from '../types'

export class ApiController {
  // 创建标准 API 响应
  private createResponse<T>(success: boolean, data?: T, error?: string): ApiResponse<T> {
    return {
      success,
      data,
      error,
      timestamp: new Date().toISOString()
    }
  }

  // 爬取相关接口
  async startCrawling(ctx: Context) {
    try {
      const body = ctx.request.body as CrawlerStartRequest

      if (!body.url) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少必需的参数: url')
        return
      }

      // 生成任务ID（如果前端没有提供）
      const taskId = body.taskId || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      logger.info(`API: Starting crawl for URL: ${body.url}, taskId: ${taskId}`)

      // 创建爬取任务
      const newTask: CrawlingTask = {
        id: taskId,
        url: body.url,
        status: 'pending',
        progress: 0,
        message: '正在启动爬取任务...',
        startTime: new Date().toISOString()
      }

      // 添加到任务管理器
      await taskService.addTask(newTask)

      // 异步执行爬取任务
      setImmediate(async () => {
        try {
          // 更新任务状态为运行中
          await taskService.startTask(taskId, '正在解析视频链接...')

          // 执行爬取，带进度回调
          const videoId = await crawlerService.startCrawling(
            body.url,
            body.options,
            (progress: number, message: string) => {
              // 更新任务进度
              taskService.updateTask(taskId, {
                progress,
                message
              }).catch(err => {
                logger.error(`Failed to update task progress for ${taskId}:`, err)
              })
            }
          )

          // 任务完成
          await taskService.completeTask(taskId, videoId)
        } catch (error: any) {
          // 任务失败
          logger.error(`API: Crawl failed for task ${taskId}:`, error)
          await taskService.failTask(taskId, error.message || '爬取失败')
        }
      })

      ctx.body = this.createResponse(true, {
        taskId,
        message: '爬取任务已启动'
      })
    } catch (error: any) {
      logger.error('API: Crawl start failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  async getVideoList(ctx: Context) {
    try {
      const videos = await crawlerService.getVideoList()

      ctx.body = this.createResponse(true, {
        videos,
        total: videos.length
      })
    } catch (error: any) {
      logger.error('API: Get video list failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 获取特定爬取任务状态
  async getCrawlingTaskStatus(ctx: Context) {
    try {
      const { taskId } = ctx.params

      if (!taskId) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少任务 ID')
        return
      }

      const task = await taskService.getTask(taskId)

      if (!task) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '任务不存在')
        return
      }

      ctx.body = this.createResponse(true, task)
    } catch (error: any) {
      logger.error('API: Get crawling task status failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 获取所有爬取任务
  async getAllCrawlingTasks(ctx: Context) {
    try {
      const tasks = await taskService.getAllTasks()

      ctx.body = this.createResponse(true, {
        tasks,
        total: tasks.length,
        active: (await taskService.getActiveTasks()).length
      })
    } catch (error: any) {
      logger.error('API: Get all crawling tasks failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 处理相关接口
  async startProcessing(ctx: Context) {
    try {
      const { id } = ctx.params
      const body = ctx.request.body as ProcessVideoRequest

      if (!id) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少视频 ID')
        return
      }

      // 检查视频是否存在
      const video = await storageService.getVideoById(id)
      if (!video) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频不存在')
        return
      }

      logger.info(`API: Starting processing for video: ${id}`)

      // 添加处理任务到队列
      const taskId = await queueService.addTask({
        videoId: id,
        type: 'process',
        status: 'pending',
        progress: 0,
        data: body.options || {}
      })

      // 更新视频状态
      await storageService.updateVideoStatus(id, {
        stage: 'transcribing',
        progress: 0,
        message: '准备开始处理视频...'
      })

      ctx.body = this.createResponse(true, {
        taskId,
        videoId: id,
        message: '处理任务已启动'
      })
    } catch (error: any) {
      logger.error('API: Process start failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 状态查询接口
  async getVideoStatus(ctx: Context) {
    try {
      const { id } = ctx.params

      if (!id) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少视频 ID')
        return
      }

      const status = await storageService.getVideoStatus(id)
      const tasks = queueService.getVideoTasks(id)

      if (!status) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频状态不存在')
        return
      }

      ctx.body = this.createResponse(true, {
        ...status,
        tasks
      })
    } catch (error: any) {
      logger.error('API: Get status failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 上传接口
  async uploadToYouTube(ctx: Context) {
    try {
      const { id } = ctx.params
      const body = ctx.request.body as UploadVideoRequest

      if (!id) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少视频 ID')
        return
      }

      if (!body.metadata?.title) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少必需的元数据: title')
        return
      }

      // 检查视频是否存在且已完成处理
      const video = await storageService.getVideoById(id)
      if (!video) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频不存在')
        return
      }

      const status = await storageService.getVideoStatus(id)
      if (status?.stage !== 'completed') {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '视频尚未完成处理，无法上传')
        return
      }

      logger.info(`API: Starting upload for video: ${id}`)

      // 添加上传任务到队列
      const taskId = await queueService.addTask({
        videoId: id,
        type: 'upload',
        status: 'pending',
        progress: 0,
        data: body.metadata
      })

      // 更新视频状态
      await storageService.updateVideoStatus(id, {
        stage: 'uploading',
        progress: 0,
        message: '准备上传到 YouTube...'
      })

      ctx.body = this.createResponse(true, {
        taskId,
        videoId: id,
        message: '上传任务已启动'
      })
    } catch (error: any) {
      logger.error('API: Upload start failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 获取单个视频详情
  async getVideoById(ctx: Context) {
    try {
      const { id } = ctx.params

      if (!id) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少视频 ID')
        return
      }

      const video = await storageService.getVideoById(id)
      if (!video) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频不存在')
        return
      }

      const status = await storageService.getVideoStatus(id)
      const tasks = queueService.getVideoTasks(id)

      ctx.body = this.createResponse(true, {
        video,
        status,
        tasks
      })
    } catch (error: any) {
      logger.error('API: Get video failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 删除爬取任务
  async deleteCrawlingTask(ctx: Context) {
    try {
      const { taskId } = ctx.params

      if (!taskId) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少任务 ID')
        return
      }

      // 检查任务是否存在
      const task = await taskService.getTask(taskId)
      if (!task) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '任务不存在')
        return
      }

      // // 不允许删除正在进行的任务
      // if (task.status === 'pending' || task.status === 'running') {
      //   ctx.status = 400
      //   ctx.body = this.createResponse(false, null, '无法删除正在进行的任务')
      //   return
      // }

      // 删除任务
      await taskService.removeTask(taskId)

      ctx.body = this.createResponse(true, {
        message: '任务已删除'
      })
    } catch (error: any) {
      logger.error('API: Delete crawling task failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }
}

// 导出单例实例
export const apiController = new ApiController() 
import { Context } from 'koa'
import { logger } from '../utils/logger'
import { storageService } from '../services/storageService'
import { queueService, TaskType } from '../services/queueService'
import {
  ApiResponse,
  CrawlerStartRequest,
  ProcessVideoRequest,
  UploadVideoRequest,
  CrawlingTask,
  VideoProcessingTask,
  UploadingTask
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


      // 添加到任务管理器
      const taskId = await queueService.addTask<CrawlingTask>({
        url: body.url,
        type: TaskType.Crawling,
        status: 'pending',
        progress: 0,
        message: '正在启动爬取任务...',
        startTime: new Date().toISOString(),
      })
      logger.info(`API: Starting crawl for URL: ${body.url}, taskId: ${taskId}`)

      // 异步执行爬取任务
      setImmediate(async () => {
        try {
          // 更新任务状态为运行中
          await queueService.startTask(taskId, TaskType.Crawling, '正在解析视频链接...')

        } catch (error: any) {
          // 任务失败
          logger.error(`API: Crawl failed for task ${taskId}:`, error)
          await queueService.failTask(taskId, TaskType.Crawling, error.message || '爬取失败')
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
      const videos = await storageService.getVideoList()
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

      const task = await queueService.getTask(taskId, TaskType.Crawling)

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
      const tasks = await queueService.getAllTasks(TaskType.Crawling)

      ctx.body = this.createResponse(true, {
        tasks,
        total: tasks.length,
        active: (await queueService.getActiveTasks(TaskType.Crawling)).length
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
      const oldTask = await queueService.getVideoTasks(id)
      const processingTask = oldTask.find(task => task.type === TaskType.Processing)
      logger.info('processingTask', processingTask)
      if (processingTask && processingTask.status !== 'completed') {
        await queueService.startTask(processingTask.id, TaskType.Processing, '正在处理视频...')
        ctx.body = this.createResponse(true, {
          taskId: processingTask.id,
          videoId: id,
          message: '处理任务已继续启动'
        })
        return
      }

      const taskId = await queueService.addTask<VideoProcessingTask>({
        videoId: id,
        type: TaskType.Processing,
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

      // 异步执行爬取任务
      setImmediate(async () => {
        try {
          // 更新任务状态为运行中
          await queueService.startTask(taskId, TaskType.Processing, '正在处理视频...')

        } catch (error: any) {
          // 任务失败
          logger.error(`API: process failed for task ${taskId}:`, error)
          await queueService.failTask(taskId, TaskType.Processing, error.message || '处理失败', '处理失败')
        }
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
      const tasks = await queueService.getVideoTasks(id)

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
      const taskId = await queueService.addTask<UploadingTask>({
        videoId: id,
        type: TaskType.Uploading,
        status: 'pending',
        progress: 0,
        data: body.metadata,
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
      const tasks = await queueService.getVideoTasks(id)

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

  async updateTranslation(ctx: Context) {
    try {
      const { videoId, subtitleId } = ctx.params
      const body = ctx.request.body as { translation: string }
      const video = await storageService.getVideoById(videoId)
      if (!video) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频不存在')
        return
      }
      await storageService.updateTranslation(videoId, subtitleId, body.translation)
      ctx.body = this.createResponse(true, {
        message: '字幕翻译已更新'
      })
    } catch (error: any) {
      logger.error('API: Update translation failed:', error)
    }
  }

  // 重试特定步骤
  async retryStep(ctx: Context) {
    try {
      const { id, step } = ctx.params
      const body = ctx.request.body as ProcessVideoRequest

      if (!id) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少视频 ID')
        return
      }

      if (!step) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, '缺少步骤名称')
        return
      }

      // 验证步骤名称
      const validSteps = ['transcribing', 'translating', 'synthesizing', 'editing', 'uploading']
      if (!validSteps.includes(step)) {
        ctx.status = 400
        ctx.body = this.createResponse(false, null, `无效的步骤名称: ${step}`)
        return
      }

      // 检查视频是否存在
      const video = await storageService.getVideoById(id)
      if (!video) {
        ctx.status = 404
        ctx.body = this.createResponse(false, null, '视频不存在')
        return
      }

      logger.info(`API: Retrying step ${step} for video: ${id}`)

      // 查找现有的失败任务
      const existingTasks = await queueService.getVideoTasks(id)
      const failedTask = existingTasks.find(task =>
        task.type === TaskType.Processing &&
        (task.status === 'failed' || task.status === 'running')
      ) as VideoProcessingTask | undefined

      let taskId: string

      if (failedTask) {
        // 重新启动现有的失败任务
        taskId = failedTask.id
        logger.info(`API: Restarting existing failed task ${taskId} for video: ${id}`)

        // 更新现有任务的数据，设置重试步骤
        await queueService.updateTask(taskId, TaskType.Processing, {
          status: 'pending',
          progress: 0,
          data: {
            ...(failedTask.data || {}),
            ...(body.options || {}),
            retryFromStep: step
          }
        })
      } else {
        // 如果没有找到失败任务，创建新任务
        taskId = await queueService.addTask<VideoProcessingTask>({
          videoId: id,
          type: TaskType.Processing,
          status: 'pending',
          progress: 0,
          data: {
            ...(body.options || {}),
            retryFromStep: step
          }
        })
        logger.info(`API: Created new retry task ${taskId} for video: ${id}`)
      }

      // 更新视频状态
      await storageService.updateVideoStatus(id, {
        stage: step as any,
        progress: 0,
        message: `正在重试步骤: ${this.getStepDisplayName(step)}...`,
        error: ''
      })

      // 异步执行重试任务
      setImmediate(async () => {
        try {
          // 更新任务状态为运行中
          await queueService.startTask(taskId, TaskType.Processing, `正在重试步骤: ${step}...`)

        } catch (error: any) {
          // 任务失败
          logger.error(`API: retry step ${step} failed for task ${taskId}:`, error)
          await queueService.failTask(taskId, TaskType.Processing, error.message || '重试失败', '重试失败')
        }
      })

      ctx.body = this.createResponse(true, {
        taskId,
        videoId: id,
        step,
        message: `步骤 ${this.getStepDisplayName(step)} 重试任务已启动`
      })
    } catch (error: any) {
      logger.error('API: Retry step failed:', error)
      ctx.status = 500
      ctx.body = this.createResponse(false, null, error.message)
    }
  }

  // 获取步骤显示名称
  private getStepDisplayName(step: string): string {
    const stepNames: Record<string, string> = {
      'transcribing': '语音转写',
      'translating': '内容翻译',
      'synthesizing': '语音合成',
      'editing': '视频编辑',
      'uploading': '上传发布'
    }
    return stepNames[step] || step
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
      const task = await queueService.getTask(taskId, TaskType.Crawling)
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
      await queueService.removeTask(taskId)

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
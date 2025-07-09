import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { CrawlingTask, UploadingTask, VideoProcessingTask } from '../types'
import { databaseService } from './databaseService'
import { crawlerService } from './crawlerService'
import { videoProcessingService } from './videoProcessingService'

export enum TaskType {
  Crawling = 'crawling',
  Processing = 'processing',
  Uploading = 'uploading'
}

export type Task = VideoProcessingTask | CrawlingTask | UploadingTask

export type taskType = TaskType.Crawling | TaskType.Processing | TaskType.Uploading

export type OmitTask<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>


export interface TaskProcessor {
  (taskId: string): Promise<void>
}

export class QueueService extends EventEmitter {
  private processing = false
  private processors: Map<string, TaskProcessor> = new Map()
  private processingInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.registerProcessor(TaskType.Crawling, crawlerService.processCrawlTask.bind(crawlerService))
    this.registerProcessor(TaskType.Processing, videoProcessingService.processVideoTask.bind(videoProcessingService))
    this.startProcessing()
  }

  // 注册任务处理器
  registerProcessor(type: taskType, processor: TaskProcessor) {
    this.processors.set(type, processor)
    logger.info(`Task processor registered for type: ${type}`)
  }

  // 添加任务到队列
  async addTask<T extends Task>(task: OmitTask<T>): Promise<string> {
    if (task.videoId && task.type === TaskType.Processing) {
      const oldFailTask = await databaseService.getTaskByVideoId(task.videoId, TaskType.Processing)
      if (oldFailTask) {
        return oldFailTask.id
      }
    }
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullTask = {
      ...task,
      id: taskId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 保存到数据库
    await databaseService.addTask(fullTask as T)
    logger.info(`Task added to database: ${fullTask.id} (${fullTask.type})`)

    this.emit('taskAdded', fullTask)

    return fullTask.id
  }

  // 获取任务状态
  async getTask(taskId: string, type: taskType): Promise<Task | undefined> {
    return await databaseService.getTask(taskId, type)
  }

  // 获取视频的所有任务
  async getVideoTasks(videoId: string): Promise<(Task)[]> {
    const allTasks: (Task)[] = []

    // 获取所有类型的任务
    const crawlingTasks = await databaseService.getAllTasks(TaskType.Crawling) as CrawlingTask[]
    const processingTasks = await databaseService.getAllTasks(TaskType.Processing) as VideoProcessingTask[]
    const uploadingTasks = await databaseService.getAllTasks(TaskType.Uploading) as VideoProcessingTask[]

    // 过滤出指定视频的任务
    allTasks.push(...crawlingTasks.filter(task => task.videoId === videoId))
    allTasks.push(...processingTasks.filter(task => task.videoId === videoId))
    allTasks.push(...uploadingTasks.filter(task => task.videoId === videoId))

    return allTasks
  }

  // 获取所有待处理任务
  async getPendingTasks(): Promise<(Task)[]> {
    const allTasks: (Task)[] = []

    // 获取所有类型的待处理任务
    const crawlingTasks = await databaseService.getActiveTasks(TaskType.Crawling) as CrawlingTask[]
    const processingTasks = await databaseService.getActiveTasks(TaskType.Processing) as VideoProcessingTask[]
    const uploadingTasks = await databaseService.getActiveTasks(TaskType.Uploading) as VideoProcessingTask[]

    allTasks.push(...crawlingTasks)
    allTasks.push(...processingTasks)
    allTasks.push(...uploadingTasks)

    // 按创建时间排序
    return allTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }

  // 处理队列中的下一个任务
  private async processNext() {
    if (this.processing) {
      return
    }

    const pendingTasks = await this.getPendingTasks()
    const nextTask = pendingTasks.find(task => task.status === 'pending' || task.status === 'running')

    if (!nextTask) {
      return
    }

    this.processing = true
    await this.processTask(nextTask)
    this.processing = false

    // 继续处理下一个任务
    setImmediate(() => this.processNext())
  }

  private async processTask(task: Task) {
    const processor = this.processors.get(task.type)
    if (!processor) {
      logger.error(`No processor found for task type: ${task.type}`)
      await databaseService.updateTask(task.id, task.type as taskType, {
        status: 'failed',
        error: `No processor found for task type: ${task.type}`,
        updatedAt: new Date().toISOString()
      })
      this.emit('taskFailed', task)
      return
    }

    try {
      logger.info(`Processing task ${task.id} (${task.type})`)
      // 更新任务状态为运行中
      await databaseService.updateTask(task.id, task.type as taskType, {
        status: 'running',
        updatedAt: new Date().toISOString()
      })
      this.emit('taskStarted', task)

      logger.info(`Processing task ${task.id} (${task.type}) for video ${task.videoId}`)

      await processor(task.id)

      // 更新任务状态为完成
      await databaseService.updateTask(task.id, task.type as taskType, {
        status: 'completed',
        progress: 100,
        updatedAt: new Date().toISOString()
      })
      this.emit('taskCompleted', task)

      logger.info(`Task completed: ${task.id}`)
    } catch (error: any) {
      // 更新任务状态为失败
      await databaseService.updateTask(task.id, task.type as taskType, {
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString()
      })
      this.emit('taskFailed', task)

      logger.error(`Task failed: ${task.id}`, error)
    }
  }

  private startProcessing() {
    // 启动时处理任何待处理的任务
    setImmediate(() => this.processNext())

    // 每隔10秒检查一次新任务
    this.processingInterval = setInterval(() => {
      this.processNext()
    }, 3000)
  }

  // 停止处理队列
  stopProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
  }

  // 清理已完成的任务（可选）
  async cleanup(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    try {
      const removed = await databaseService.cleanupTasks(maxAge / (24 * 60 * 60 * 1000))
      if (removed > 0) {
        logger.info(`Cleaned up ${removed} old tasks from database`)
      }
    } catch (error) {
      logger.error('Failed to cleanup tasks:', error)
    }
  }

  // ==================== 任务管理方法 ====================

  // 更新任务状态
  async updateTask(taskId: string, type: taskType, updates: Partial<Task>): Promise<void> {
    try {
      await databaseService.updateTask(taskId, type, updates)
      logger.info(`Task updated: ${taskId}, status: ${updates.status || 'unknown'}, progress: ${updates.progress || 0}%`)
    } catch (error) {
      logger.error(`Failed to update task ${taskId}:`, error)
      throw error
    }
  }

  // 获取所有任务
  async getAllTasks(type: taskType): Promise<CrawlingTask[] | VideoProcessingTask[]> {
    try {
      return await databaseService.getAllTasks(type) as CrawlingTask[] | VideoProcessingTask[]
    } catch (error) {
      logger.error('Failed to get all tasks:', error)
      return []
    }
  }

  // 获取活跃任务（pending 或 running）
  async getActiveTasks(type: taskType): Promise<(Task)[]> {
    try {
      return await databaseService.getActiveTasks(type)
    } catch (error) {
      logger.error('Failed to get active tasks:', error)
      return []
    }
  }

  // 移除任务
  async removeTask(taskId: string): Promise<boolean> {
    try {
      const removed = await databaseService.removeTask(taskId)
      if (removed) {
        logger.info(`Task removed: ${taskId}`)
      }
      return removed
    } catch (error) {
      logger.error(`Failed to remove task ${taskId}:`, error)
      return false
    }
  }

  // 设置任务为完成状态
  async completeTask(taskId: string, type: taskType, videoId?: string, message: string = '任务完成'): Promise<void> {
    await this.updateTask(taskId, type, {
      status: 'completed',
      progress: 100,
      message,
      endTime: new Date().toISOString(),
      videoId
    })
  }

  // 设置任务为失败状态
  async failTask(taskId: string, type: taskType, error: string, message: string = '任务失败'): Promise<void> {
    await this.updateTask(taskId, type, {
      status: 'failed',
      message,
      error,
      endTime: new Date().toISOString()
    })
  }

  // 设置任务为运行状态
  async startTask(taskId: string, type: taskType, message: string = '开始执行'): Promise<void> {
    await this.updateTask(taskId, type, {
      status: 'running',
      message,
      progress: 0,
      error: '',
    })
  }
}

// 单例实例
export const queueService = new QueueService()

// 定期清理任务队列
setInterval(() => {
  queueService.cleanup()
}, 60 * 60 * 1000) // 每小时清理一次 
import { EventEmitter } from 'events'
import { logger } from '../utils/logger'
import { CrawlingTask, VideoProcessingTask } from '../types'
import { taskType } from './taskService'

export interface TaskProcessor {
  (taskId: string): Promise<void>
}

export class QueueService extends EventEmitter {
  private queue: (VideoProcessingTask | CrawlingTask)[] = []
  private processing = false
  private processors: Map<string, TaskProcessor> = new Map()

  constructor() {
    super()
    this.startProcessing()
  }

  // 注册任务处理器
  registerProcessor(type: taskType, processor: TaskProcessor) {
    this.processors.set(type, processor)
    logger.info(`Task processor registered for type: ${type}`)
  }

  // 添加任务到队列
  async addTask(task: VideoProcessingTask | CrawlingTask): Promise<string> {
    const fullTask: VideoProcessingTask | CrawlingTask = {
      ...task,
      id: task.id || this.generateTaskId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.queue.push(fullTask)
    logger.info(`Task added to queue: ${fullTask.id} (${fullTask.type})`)

    this.emit('taskAdded', fullTask)
    this.processNext()

    return fullTask.id
  }

  // 获取任务状态
  getTask(taskId: string): VideoProcessingTask | CrawlingTask | undefined {
    return this.queue.find(task => task.id === taskId)
  }

  // 获取视频的所有任务
  getVideoTasks(videoId: string): (VideoProcessingTask | CrawlingTask)[] {
    return this.queue.filter(task => task.videoId === videoId)
  }

  // 处理队列中的下一个任务
  private async processNext() {
    if (this.processing) {
      return
    }

    const pendingTask = this.queue.find(task => task.status === 'pending')
    if (!pendingTask) {
      return
    }

    this.processing = true
    await this.processTask(pendingTask)
    this.processing = false

    // 继续处理下一个任务
    setImmediate(() => this.processNext())
  }

  private async processTask(task: VideoProcessingTask | CrawlingTask) {
    const processor = this.processors.get(task.type)
    if (!processor) {
      logger.error(`No processor found for task type: ${task.type}`)
      task.status = 'failed'
      task.error = `No processor found for task type: ${task.type}`
      task.updatedAt = new Date().toISOString()
      this.emit('taskFailed', task)
      return
    }

    try {
      task.status = 'running'
      task.updatedAt = new Date().toISOString()
      this.emit('taskStarted', task)

      logger.info(`Processing task ${task.id} (${task.type}) for video ${task.videoId}`)

      await processor(task.id)

      task.status = 'completed'
      task.progress = 100
      task.updatedAt = new Date().toISOString()
      this.emit('taskCompleted', task)

      logger.info(`Task completed: ${task.id}`)
    } catch (error: any) {
      task.status = 'failed'
      task.error = error.message
      task.updatedAt = new Date().toISOString()
      this.emit('taskFailed', task)

      logger.error(`Task failed: ${task.id}`, error)
    }
  }

  private startProcessing() {
    // 启动时处理任何待处理的任务
    setImmediate(() => this.processNext())
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // 清理已完成的任务（可选）
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    const now = Date.now()
    const initialLength = this.queue.length

    this.queue = this.queue.filter(task => {
      const taskAge = now - new Date(task.createdAt).getTime()
      return task.status === 'pending' || task.status === 'running' || taskAge < maxAge
    })

    const removed = initialLength - this.queue.length
    if (removed > 0) {
      logger.info(`Cleaned up ${removed} old tasks from queue`)
    }
  }
}

// 单例实例
export const queueService = new QueueService()

// 定期清理任务队列
setInterval(() => {
  queueService.cleanup()
}, 60 * 60 * 1000) // 每小时清理一次 
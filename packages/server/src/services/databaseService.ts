import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import path from 'path'
import { logger } from '../utils/logger'
import { CrawlingTask, VideoMetadata } from '../types'

// 数据库结构
interface DatabaseSchema {
  crawlingTasks: CrawlingTask[]
  videos: VideoMetadata[]
}

class DatabaseService {
  private db: low.LowdbSync<DatabaseSchema>

  constructor() {
    // 数据文件路径
    const dbPath = path.join(process.cwd(), 'data', 'db.json')
    const adapter = new FileSync<DatabaseSchema>(dbPath)

    // 初始化数据库
    this.db = low(adapter)

    // 设置默认值
    this.db.defaults({
      crawlingTasks: [],
      videos: []
    }).write()

    logger.info(`Database initialized at: ${dbPath}`)
  }

  // 任务相关方法
  async addTask(task: CrawlingTask): Promise<void> {
    try {
      this.db.get('crawlingTasks')
        .push(task)
        .write()
      logger.info(`Task added: ${task.id}`)
    } catch (error) {
      logger.error(`Failed to add task ${task.id}:`, error)
      throw error
    }
  }

  async getTask(taskId: string): Promise<CrawlingTask | undefined> {
    try {
      return this.db.get('crawlingTasks')
        .find({ id: taskId })
        .value()
    } catch (error) {
      logger.error(`Failed to get task ${taskId}:`, error)
      throw error
    }
  }

  async updateTask(taskId: string, updates: Partial<CrawlingTask>): Promise<boolean> {
    try {
      const task = this.db.get('crawlingTasks')
        .find({ id: taskId })

      if (!task.value()) {
        return false
      }

      task.assign(updates).write()
      logger.info(`Task updated: ${taskId}`)
      return true
    } catch (error) {
      logger.error(`Failed to update task ${taskId}:`, error)
      throw error
    }
  }

  async removeTask(taskId: string): Promise<boolean> {
    try {
      const initialLength = this.db.get('crawlingTasks').size().value()
      this.db.get('crawlingTasks')
        .remove({ id: taskId })
        .write()
      const newLength = this.db.get('crawlingTasks').size().value()

      const removed = initialLength > newLength
      if (removed) {
        logger.info(`Task removed: ${taskId}`)
      }
      return removed
    } catch (error) {
      logger.error(`Failed to remove task ${taskId}:`, error)
      throw error
    }
  }

  async getAllTasks(): Promise<CrawlingTask[]> {
    try {
      return this.db.get('crawlingTasks')
        .orderBy(['startTime'], ['desc'])
        .value()
    } catch (error) {
      logger.error('Failed to get all tasks:', error)
      throw error
    }
  }

  async getActiveTasks(): Promise<CrawlingTask[]> {
    try {
      return this.db.get('crawlingTasks')
        .filter(task => task.status === 'pending' || task.status === 'running')
        .orderBy(['startTime'], ['asc'])
        .value()
    } catch (error) {
      logger.error('Failed to get active tasks:', error)
      throw error
    }
  }

  // 视频相关方法
  async addVideo(video: VideoMetadata): Promise<void> {
    try {
      this.db.get('videos')
        .push(video)
        .write()
      logger.info(`Video added: ${video.id}`)
    } catch (error) {
      logger.error(`Failed to add video ${video.id}:`, error)
      throw error
    }
  }

  async getVideo(videoId: string): Promise<VideoMetadata | undefined> {
    try {
      return this.db.get('videos')
        .find({ id: videoId })
        .value()
    } catch (error) {
      logger.error(`Failed to get video ${videoId}:`, error)
      throw error
    }
  }

  async updateVideo(videoId: string, updates: Partial<VideoMetadata>): Promise<boolean> {
    try {
      const video = this.db.get('videos')
        .find({ id: videoId })

      if (!video.value()) {
        return false
      }

      video.assign(updates).write()
      logger.info(`Video updated: ${videoId}`)
      return true
    } catch (error) {
      logger.error(`Failed to update video ${videoId}:`, error)
      throw error
    }
  }

  async getAllVideos(): Promise<VideoMetadata[]> {
    try {
      return this.db.get('videos')
        .orderBy(['downloadTime'], ['desc'])
        .value()
    } catch (error) {
      logger.error('Failed to get all videos:', error)
      throw error
    }
  }

  // 清理过期任务
  async cleanupTasks(maxAgeDays: number = 7): Promise<number> {
    try {
      const now = new Date()
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000 // 转换为毫秒

      const initialLength = this.db.get('crawlingTasks').size().value()

      this.db.get('crawlingTasks')
        .remove(task => {
          const taskDate = new Date(task.startTime)
          return now.getTime() - taskDate.getTime() > maxAge &&
            (task.status === 'completed' || task.status === 'failed')
        })
        .write()

      const newLength = this.db.get('crawlingTasks').size().value()
      const removedCount = initialLength - newLength

      if (removedCount > 0) {
        logger.info(`Cleaned up ${removedCount} old tasks`)
      }
      return removedCount
    } catch (error) {
      logger.error('Failed to cleanup tasks:', error)
      throw error
    }
  }
}

// 导出单例
export const databaseService = new DatabaseService() 
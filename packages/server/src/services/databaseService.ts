import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import path from 'path'
import { logger } from '../utils/logger'
import { CrawlingTask, VideoMetadata, VideoProcessingTask } from '../types'
import { taskType } from './taskService'

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
      processingTasks: [],
      uploadingTasks: [],
      videos: []
    }).write()

    logger.info(`Database initialized at: ${dbPath}`)
  }

  // 任务相关方法
  async addTask(task: CrawlingTask | VideoProcessingTask): Promise<void> {
    try {
      const taskTypeKey = task.type + 'Tasks'
      this.db.get(taskTypeKey)
        .push(task)
        .write()
      logger.info(`${taskTypeKey} Task added: ${task.id}`)
    } catch (error) {
      logger.error(`Failed to add task ${task.id}:`, error)
      throw error
    }
  }

  async getTask(taskId: string, type: taskType): Promise<CrawlingTask | VideoProcessingTask | undefined> {
    try {
      return this.db.get(type + 'Tasks')
        .find({ id: taskId })
        .value()
    } catch (error) {
      logger.error(`Failed to get task ${taskId}:`, error)
      throw error
    }
  }

  async updateTask(taskId: string, type: taskType, updates: Partial<CrawlingTask | VideoProcessingTask>): Promise<boolean> {
    try {
      const task = this.db.get(type + 'Tasks')
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

  async getAllTasks(type: taskType): Promise<CrawlingTask[] | VideoProcessingTask[]> {
    try {
      return this.db.get(type + 'Tasks')
        .orderBy(['startTime'], ['desc'])
        .value()
    } catch (error) {
      logger.error('Failed to get all tasks:', error)
      throw error
    }
  }

  async getActiveTasks(type: taskType): Promise<CrawlingTask[] | VideoProcessingTask[]> {
    try {
      return this.db.get(type + 'Tasks')
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
      const types = ['crawling', 'processing', 'uploading']
      let removedCount = 0
      for (const type of types) {
        const initialLength = this.db.get(type + 'Tasks').size().value()

        this.db.get(type + 'Tasks')
          .remove(task => {
            const taskDate = new Date(task.startTime)
            return now.getTime() - taskDate.getTime() > maxAge &&
              (task.status === 'completed' || task.status === 'failed')
          })
          .write()

        const newLength = this.db.get(type + 'Tasks').size().value()
        const removedCount = initialLength - newLength

        if (removedCount > 0) {
          logger.info(`Cleaned up ${removedCount} old tasks`)
        }
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
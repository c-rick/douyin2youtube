import { logger } from '../utils/logger'
import { CrawlingTask } from '../types'
import { databaseService } from './databaseService'

class TaskService {
  // 添加新任务
  async addTask(task: CrawlingTask): Promise<void> {
    try {
      await databaseService.addTask(task)
      logger.info(`Task added: ${task.id} for URL: ${task.url}`)
    } catch (error) {
      logger.error(`Failed to add task ${task.id}:`, error)
      throw error
    }
  }

  // 更新任务状态
  async updateTask(taskId: string, updates: Partial<CrawlingTask>): Promise<void> {
    try {
      await databaseService.updateTask(taskId, updates)
      logger.info(`Task updated: ${taskId}, status: ${updates.status || 'unknown'}, progress: ${updates.progress || 0}%`)
    } catch (error) {
      logger.error(`Failed to update task ${taskId}:`, error)
      throw error
    }
  }

  // 获取任务状态
  async getTask(taskId: string): Promise<CrawlingTask | null> {
    try {
      const task = await databaseService.getTask(taskId)
      return task || null
    } catch (error) {
      logger.error(`Failed to get task ${taskId}:`, error)
      return null
    }
  }

  // 获取所有任务
  async getAllTasks(): Promise<CrawlingTask[]> {
    try {
      return await databaseService.getAllTasks()
    } catch (error) {
      logger.error('Failed to get all tasks:', error)
      return []
    }
  }

  // 获取活跃任务（pending 或 running）
  async getActiveTasks(): Promise<CrawlingTask[]> {
    try {
      return await databaseService.getActiveTasks()
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

  // 清理已完成或失败的任务（可选：定期清理）
  async cleanupCompletedTasks(olderThanHours: number = 24): Promise<number> {
    try {
      return await databaseService.cleanupTasks(olderThanHours)
    } catch (error) {
      logger.error('Failed to cleanup old tasks:', error)
      return 0
    }
  }

  // 设置任务为完成状态
  async completeTask(taskId: string, videoId?: string): Promise<void> {
    await this.updateTask(taskId, {
      status: 'completed',
      progress: 100,
      message: '爬取完成',
      endTime: new Date().toISOString(),
      videoId
    })
  }

  // 设置任务为失败状态
  async failTask(taskId: string, error: string): Promise<void> {
    await this.updateTask(taskId, {
      status: 'failed',
      message: '爬取失败',
      error,
      endTime: new Date().toISOString()
    })
  }

  // 设置任务为运行状态
  async startTask(taskId: string, message: string = '开始爬取'): Promise<void> {
    await this.updateTask(taskId, {
      status: 'running',
      message,
      progress: 0
    })
  }
}

// 导出单例实例
export const taskService = new TaskService() 
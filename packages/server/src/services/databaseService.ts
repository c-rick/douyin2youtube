import low from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync'
import path from 'path'
import { logger } from '../utils/logger'
import { VideoMeta, ProcessingStage } from '../shared/types'

// 简化的数据库结构
interface DatabaseSchema {
  videos: VideoMeta[]
}

class DatabaseService {
  private db: any

  constructor() {
    // 数据文件路径
    const dbPath = path.join(process.cwd(), 'data', 'db.json')
    const adapter = new FileSync<DatabaseSchema>(dbPath)

    // 初始化数据库
    this.db = low(adapter)

    // 设置默认值
    this.db.defaults({
      videos: []
    }).write()

    logger.info(`Database initialized at: ${dbPath}`)
  }

  // 视频相关方法
  async addVideo(video: VideoMeta): Promise<void> {
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

  async getVideoById(videoId: string): Promise<VideoMeta | undefined> {
    try {
      return this.db.get('videos')
        .find({ id: videoId })
        .value()
    } catch (error) {
      logger.error(`Failed to get video ${videoId}:`, error)
      throw error
    }
  }

  async updateVideo(videoId: string, updates: Partial<VideoMeta>): Promise<boolean> {
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

  async updateVideoStatus(videoId: string, status: {
    stage: ProcessingStage
    progress: number
    message?: string
    error?: string
  }): Promise<boolean> {
    try {
      const video = this.db.get('videos')
        .find({ id: videoId })

      if (!video.value()) {
        return false
      }

      video.assign({ status }).write()
      logger.info(`Video status updated: ${videoId} - ${status.stage} (${status.progress}%)`)
      return true
    } catch (error) {
      logger.error(`Failed to update video status ${videoId}:`, error)
      throw error
    }
  }

  async getAllVideos(): Promise<VideoMeta[]> {
    try {
      return this.db.get('videos')
        .orderBy(['createdAt'], ['desc'])
        .value()
    } catch (error) {
      logger.error('Failed to get all videos:', error)
      throw error
    }
  }

  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const initialLength = this.db.get('videos').size().value()
      this.db.get('videos')
        .remove({ id: videoId })
        .write()
      const newLength = this.db.get('videos').size().value()

      const removed = initialLength > newLength
      if (removed) {
        logger.info(`Video deleted: ${videoId}`)
      }
      return removed
    } catch (error) {
      logger.error(`Failed to delete video ${videoId}:`, error)
      throw error
    }
  }

  // 查询方法
  async getVideosByStatus(stage: ProcessingStage): Promise<VideoMeta[]> {
    try {
      return this.db.get('videos')
        .filter({ status: { stage } })
        .orderBy(['createdAt'], ['desc'])
        .value()
    } catch (error) {
      logger.error(`Failed to get videos by status ${stage}:`, error)
      throw error
    }
  }

  async getVideosWithYouTubeId(): Promise<VideoMeta[]> {
    try {
      return this.db.get('videos')
        .filter((video: VideoMeta) => !!video.youtubeId)
        .orderBy(['createdAt'], ['desc'])
        .value()
    } catch (error) {
      logger.error('Failed to get videos with YouTube ID:', error)
      throw error
    }
  }

  // 统计方法
  async getStats(): Promise<{
    total: number
    byStatus: Record<ProcessingStage, number>
    withTranslation: number
    uploaded: number
  }> {
    try {
      const videos = this.db.get('videos').value()
      const total = videos.length

      const byStatus: Record<ProcessingStage, number> = {
        idle: 0,
        downloading: 0,
        translating: 0,
        uploading: 0,
        completed: 0,
        error: 0
      }

      let withTranslation = 0
      let uploaded = 0

      videos.forEach((video: VideoMeta) => {
        byStatus[video.status.stage]++
        if (video.titleEn) withTranslation++
        if (video.youtubeId) uploaded++
      })

      return {
        total,
        byStatus,
        withTranslation,
        uploaded
      }
    } catch (error) {
      logger.error('Failed to get stats:', error)
      throw error
    }
  }

  // 清理方法
  async cleanupOldVideos(maxAgeDays: number = 30): Promise<number> {
    try {
      const now = new Date()
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000 // 转换为毫秒

      const initialLength = this.db.get('videos').size().value()

      this.db.get('videos')
        .remove((video: VideoMeta) => {
          const videoDate = new Date(video.createdAt)
          return (now.getTime() - videoDate.getTime()) > maxAge
        })
        .write()

      const newLength = this.db.get('videos').size().value()
      const removedCount = initialLength - newLength

      if (removedCount > 0) {
        logger.info(`Cleaned up ${removedCount} old videos`)
      }

      return removedCount
    } catch (error) {
      logger.error('Failed to cleanup old videos:', error)
      throw error
    }
  }
}

// 导出单例
export const databaseService = new DatabaseService() 
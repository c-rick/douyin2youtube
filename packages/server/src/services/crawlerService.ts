import * as path from 'path'
import { crawlVideo } from '../crawler'
import { logger } from '../utils/logger'
import { databaseService } from './databaseService'
import { VideoMeta } from '../shared/types'

class CrawlerService {
  // 下载抖音视频
  async crawlVideo(url: string): Promise<VideoMeta> {
    logger.info(`Starting crawl for URL: ${url}`)

    // 生成视频ID
    const videoId = this.generateVideoId()
    const outputDir = path.join(process.cwd(), 'data', 'downloads', videoId)

    // 创建初始视频记录
    const initialVideo: VideoMeta = {
      id: videoId,
      title: '',
      author: '',
      coverUrl: '',
      videoUrl: '',
      duration: 0,
      shareUrl: url,
      createdAt: new Date().toISOString(),
      status: {
        stage: 'downloading',
        progress: 0,
        message: '开始下载视频...'
      }
    }

    await databaseService.addVideo(initialVideo)

    try {
      // 更新下载进度
      await databaseService.updateVideoStatus(videoId, {
        stage: 'downloading',
        progress: 20,
        message: '正在解析视频链接...'
      })

      logger.info(`Crawling video: ${url}`)
      const result = await crawlVideo(url, {
        outputDir,
        downloadCover: true
      })

      // 更新下载进度
      await databaseService.updateVideoStatus(videoId, {
        stage: 'downloading',
        progress: 30,
        message: '保存视频文件...'
      })

      // 构建完整的视频元数据
      const serverUrl = `http://localhost:${process.env.SERVER_PORT || 3001}`
      const videoMeta: Partial<VideoMeta> = {
        title: result.videoMeta.title || '未知标题',
        author: result.videoMeta.author || '未知作者',
        coverUrl: result.videoMeta.coverUrl || '',
        videoUrl: result.videoMeta.videoUrl || '',
        duration: result.videoMeta.duration || 0,
        localPath: result.paths.video || '',
        remotePath: `${serverUrl}/api/file/${videoId}`,
        status: {
          stage: 'idle',
          progress: 40,
          message: '视频下载完成'
        }
      }

      // 更新视频元数据
      await databaseService.updateVideo(videoId, videoMeta)

      logger.info(`Crawl completed for video: ${videoId}`)

      // 返回完整的视频数据
      const completeVideo = await databaseService.getVideoById(videoId)
      if (!completeVideo) {
        throw new Error('Failed to retrieve video after saving')
      }

      return completeVideo

    } catch (error: any) {
      logger.error(`Crawl failed for video ${videoId}:`, error)

      // 更新失败状态
      await databaseService.updateVideoStatus(videoId, {
        stage: 'error',
        progress: 0,
        message: '视频下载失败',
        error: error.message
      })

      throw error
    }
  }

  // 生成视频ID
  private generateVideoId(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const random = Math.random().toString(36).substr(2, 8)
    return `${date}_${random}`
  }
}

// 单例实例
export const crawlerService = new CrawlerService() 
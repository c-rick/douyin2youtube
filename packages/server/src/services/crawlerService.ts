import { crawlVideo } from '../crawler'
import { logger } from '../utils/logger'
import { storageService } from './storageService'
import { queueService, TaskProcessor } from './queueService'
import { VideoProcessingTask } from '../types'

export class CrawlerService {
  constructor() {
    // 注册爬取任务处理器
    queueService.registerProcessor('crawl', this.processCrawlTask.bind(this))
  }

  // 开始爬取任务
  async startCrawling(
    url: string,
    options: any = {},
    progressCallback?: (progress: number, message: string) => void
  ): Promise<string> {
    logger.info(`Starting crawl for URL: ${url}`)

    // 生成视频ID
    const videoId = this.generateVideoId()

    try {
      // 报告进度：开始处理
      progressCallback?.(5, '生成视频ID...')

      // 创建视频目录
      await storageService.createVideoDirectory(videoId)
      progressCallback?.(10, '创建存储目录...')

      // 初始化视频状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'downloading',
        progress: 0,
        message: '准备开始爬取视频...',
        startTime: new Date().toISOString()
      })
      progressCallback?.(15, '初始化视频状态...')

      // 调用 crawler 包的功能
      progressCallback?.(20, '正在解析视频链接...')

      const videoDir = storageService.getVideoDirectory(videoId)

      logger.info(`Crawling video: ${url}`)
      const result = await crawlVideo(url, {
        outputDir: videoDir,
        downloadCover: options.downloadCover !== false,
        ...options
      })

      // 报告进度：下载完成
      progressCallback?.(70, '视频下载完成，保存元数据...')

      // 保存视频元数据
      const videoMeta = {
        id: videoId,
        title: result.videoMeta.title || '未知标题',
        author: result.videoMeta.author || '未知作者',
        coverUrl: result.videoMeta.coverUrl || '',
        videoUrl: result.videoMeta.videoUrl || '',
        duration: result.videoMeta.duration || 0,
        shareUrl: result.videoMeta.shareUrl || url,
        createdAt: result.videoMeta.createdAt || new Date().toISOString(),
        downloadTime: new Date().toISOString(),
        status: {
          stage: 'idle',
          progress: 100,
          message: '视频下载完成，等待处理'
        },
        localPaths: {
          video: result.paths.video,
          cover: result.paths.cover,
          meta: result.paths.meta,
          directory: videoDir
        }
      }

      await storageService.saveVideoMeta(videoMeta)
      progressCallback?.(90, '保存视频元数据...')

      // 更新最终状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'idle',
        progress: 100,
        message: '视频爬取完成',
        endTime: new Date().toISOString()
      })

      progressCallback?.(100, '视频爬取完成')
      logger.info(`Crawl completed for video: ${videoId}`)

      return videoId
    } catch (error: any) {
      logger.error(`Crawl failed for video ${videoId}:`, error)

      // 更新失败状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'error',
        progress: 0,
        message: '视频爬取失败',
        error: error.message,
        endTime: new Date().toISOString()
      })

      throw error
    }
  }

  // 处理爬取任务
  private async processCrawlTask(task: VideoProcessingTask): Promise<void> {
    const { url, options } = task.data
    const videoDir = storageService.getVideoDirectory(task.videoId)

    try {
      // 更新状态：开始下载
      await storageService.updateVideoStatus(task.videoId, {
        stage: 'downloading',
        progress: 10,
        message: '正在解析视频链接...'
      })

      // 调用 crawler 包的功能
      logger.info(`Crawling video: ${url}`)
      const result = await crawlVideo(url, {
        outputDir: videoDir,
        downloadCover: options.downloadCover !== false,
        ...options
      })

      // 更新进度
      await storageService.updateVideoStatus(task.videoId, {
        stage: 'downloading',
        progress: 50,
        message: '正在下载视频文件...'
      })

      // 保存视频元数据
      const videoMeta = {
        id: task.videoId,
        title: result.videoMeta.title || '未知标题',
        author: result.videoMeta.author || '未知作者',
        coverUrl: result.videoMeta.coverUrl || '',
        videoUrl: result.videoMeta.videoUrl || '',
        duration: result.videoMeta.duration || 0,
        shareUrl: result.videoMeta.shareUrl || url,
        createdAt: result.videoMeta.createdAt || new Date().toISOString(),
        downloadTime: new Date().toISOString(),
        status: {
          stage: 'idle',
          progress: 100,
          message: '视频下载完成，等待处理'
        },
        localPaths: {
          video: result.paths.video,
          cover: result.paths.cover,
          meta: result.paths.meta,
          directory: videoDir
        }
      }

      await storageService.saveVideoMeta(videoMeta)

      // 更新最终状态
      await storageService.updateVideoStatus(task.videoId, {
        stage: 'idle',
        progress: 100,
        message: '视频爬取完成',
        endTime: new Date().toISOString()
      })

      task.progress = 100
      logger.info(`Crawl completed for video: ${task.videoId}`)

    } catch (error: any) {
      logger.error(`Crawl failed for video ${task.videoId}:`, error)

      // 更新失败状态
      await storageService.updateVideoStatus(task.videoId, {
        stage: 'error',
        progress: 0,
        message: '视频爬取失败',
        error: error.message,
        endTime: new Date().toISOString()
      })

      throw error
    }
  }

  // 获取视频列表
  async getVideoList(): Promise<any[]> {
    return await storageService.getVideoList()
  }

  // 获取单个视频信息
  async getVideoById(id: string): Promise<any | null> {
    return await storageService.getVideoById(id)
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
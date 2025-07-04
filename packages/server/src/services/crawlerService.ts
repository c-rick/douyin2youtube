import { crawlVideo } from '../crawler'
import { logger } from '../utils/logger'
import { storageService } from './storageService'
import { queueService, TaskProcessor } from './queueService'
import { CrawlingTask, VideoProcessingTask } from '../types'
import { taskService, TaskType, taskType } from './taskService'

export class CrawlerService {
  taskType: taskType
  constructor() {
    this.taskType = TaskType.Crawling
    // 注册爬取任务处理器
    queueService.registerProcessor(TaskType.Crawling, this.processCrawlTask.bind(this))
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
  public async processCrawlTask(taskId: string): Promise<void> {
    const task = await taskService.getTask(taskId, this.taskType) as CrawlingTask
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }
    const { url, options, videoId } = task


    try {
      const videoId = await this.startCrawling(url, options, (progress: number, message: string) => {
        taskService.updateTask(taskId, this.taskType, {
          progress,
          message
        })
      })

      // 任务完成
      await taskService.completeTask(taskId, this.taskType, videoId)
    } catch (error: any) {
      logger.error(`Crawl failed for video ${videoId}:`, error)


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
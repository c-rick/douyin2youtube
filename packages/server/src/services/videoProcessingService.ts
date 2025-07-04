import path from 'path'
import { logger } from '../utils/logger'
import { storageService } from './storageService'
import { queueService, TaskProcessor } from './queueService'
import { VideoProcessingTask } from '../types'
import { Transcriber } from '../transcriber'
import { TranscriberError } from '../transcriber/utils/errors'
import { taskService, TaskType } from './taskService'

export class VideoProcessingService {
  private transcriber: Transcriber

  constructor() {
    // 初始化 Transcriber，使用环境变量中的 API Key
    this.transcriber = new Transcriber(
      this.onTranscriptionProgress.bind(this)
    )

    // 注册视频处理任务处理器
    queueService.registerProcessor(TaskType.Processing, this.processVideoTask.bind(this))
  }

  // 转写进度回调
  private onTranscriptionProgress(progress: any) {
    logger.debug('Transcription progress:', progress)
  }

  // 处理视频任务
  public async processVideoTask(taskId: string): Promise<void> {
    const task = await taskService.getTask(taskId, TaskType.Processing) as VideoProcessingTask
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }
    const { videoId, data: options } = task

    try {
      logger.info(`Starting video processing for video: ${videoId}`)

      // 获取视频信息
      const video = await storageService.getVideoById(videoId)
      if (!video) {
        throw new Error(`Video not found: ${videoId}`)
      }

      // 确保视频文件存在
      const videoPath = video.localPaths?.video
      if (!videoPath) {
        throw new Error(`Video file path not found for video: ${videoId}`)
      }

      // 第一步：音频转写
      await this.transcribeVideo(videoId, videoPath, options)

      // 更新最终状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'completed',
        progress: 100,
        message: '视频处理完成',
        endTime: new Date().toISOString()
      })

      task.progress = 100
      logger.info(`Video processing completed for video: ${videoId}`)

    } catch (error: any) {
      logger.error(`Video processing failed for video ${videoId}:`, error)

      // 更新失败状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'error',
        progress: 0,
        message: '视频处理失败',
        error: error.message,
        endTime: new Date().toISOString()
      })

      throw error
    }
  }

  // 转写视频
  private async transcribeVideo(videoId: string, videoPath: string, options: any): Promise<void> {
    try {
      // 更新状态：开始转写
      await storageService.updateVideoStatus(videoId, {
        stage: 'transcribing',
        progress: 5,
        message: '正在准备音频转写...'
      })

      // 设置转写选项
      const transcriptionOptions = {
        audioPath: videoPath,
        language: options.targetLanguage === 'english' ? 'en' : 'zh',
        responseFormat: 'verbose_json' as const,
        temperature: 0.2
      }

      logger.info(`Starting transcription for video: ${videoId}`)

      // 进行转写，带进度更新
      const result = await this.transcriber.transcribe(transcriptionOptions)

      // 更新进度
      await storageService.updateVideoStatus(videoId, {
        stage: 'transcribing',
        progress: 90,
        message: '正在保存转写结果...'
      })

      // 保存转写结果
      const videoDir = storageService.getVideoDirectory(videoId)
      const transcriptPath = path.join(videoDir, 'transcript.json')
      const srtPath = path.join(videoDir, 'transcript.srt')

      // 保存 JSON 格式的转写结果
      await storageService.saveTranscriptionResult(videoId, result)

      // 保存 SRT 字幕文件
      await this.transcriber.saveAsSRT(result, srtPath)

      // 更新进度
      await storageService.updateVideoStatus(videoId, {
        stage: 'transcribing',
        progress: 100,
        message: '音频转写完成'
      })

      logger.info(`Transcription completed for video: ${videoId}`)

    } catch (error: any) {
      logger.error(`Transcription failed for video ${videoId}:`, error)

      if (error instanceof TranscriberError) {
        throw new Error(`转写失败: ${error.message}`)
      }

      throw new Error(`转写过程中发生错误: ${error.message}`)
    }
  }
}

// 创建单例实例
export const videoProcessingService = new VideoProcessingService() 
import path from 'path'
import { logger } from '../utils/logger'
import { storageService } from './storageService'
import { queueService, TaskProcessor, taskType, TaskType } from './queueService'
import { VideoProcessingTask } from '../types'
import { Transcriber } from '../transcriber'
import { Translator } from '../translator'
import { convertTranscriptionToTranslationSegments } from '../translator/utils/translationUtils'
import { SynthesizerService, SynthesisProgress } from '../synthesizer'

export class VideoProcessingService {
  taskType: taskType

  constructor() {
    this.taskType = TaskType.Processing
  }

  init() {
    queueService.registerProcessor(this.taskType, this.processVideoTask.bind(this))
  }

  // 处理视频任务
  public async processVideoTask(taskId: string): Promise<void> {
    const task = await queueService.getTask(taskId, this.taskType) as VideoProcessingTask
    if (!task) {
      throw new Error(`Task not found: ${taskId}`)
    }
    const { videoId, data: options } = task

    try {
      const retryFromStep = options.retryFromStep
      const isRetry = !!retryFromStep

      logger.info(`${isRetry ? 'Retrying' : 'Starting'} video processing for video: ${videoId}${isRetry ? ` from step: ${retryFromStep}` : ''}`)
      if (isRetry) {
        await queueService.updateTask(taskId, this.taskType, {
          data: {
            retryFromStep: null
          }
        })
      }
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

      // 前端通过传递步骤 获取当前视频任务的进度
      const videoTaskProcess = video?.status?.progress
      const shouldRunTranscription = videoTaskProcess < 40 || (retryFromStep === 'transcribing')
      const shouldRunTranslation = videoTaskProcess < 60 || (['transcribing', 'translating'].includes(retryFromStep))
      const shouldRunSynthesis = videoTaskProcess < 80 || (['transcribing', 'translating', 'synthesizing'].includes(retryFromStep))
      const shouldRunEditing = videoTaskProcess < 100 || (['transcribing', 'translating', 'synthesizing', 'editing'].includes(retryFromStep))

      let transcriptionResult: any = null
      let translationResult: any = null

      // 第一步：音频转写
      if (shouldRunTranscription) {
        await storageService.updateVideoStatus(videoId, {
          stage: 'transcribing',
          progress: 0,
          message: '准备视频处理...',
          error: '',
        })


        const transcriber = new Transcriber(({ stage, status, progress, message, error }) => {
          storageService.updateVideoStatus(videoId, {
            stage: stage === 'completed' ? 'transcribing' : stage,
            status,
            progress,
            message,
            error,
          })
        });

        transcriptionResult = await transcriber.transcribe({
          audioPath: videoPath,
          language: 'en',
          prompt: '请将音频中的对话转写为中文',
          temperature: 0.5,
          responseFormat: 'verbose_json'
        })

        // 保存转写结果
        await storageService.saveTranscriptionResult(videoId, transcriptionResult)
      } else {
        // 如果跳过转写，尝试加载已有的转写结果
        try {
          transcriptionResult = await storageService.getTranscriptionResult(videoId)
          if (!transcriptionResult) {
            throw new Error('转写结果不存在，无法跳过转写步骤')
          }
        } catch (error) {
          logger.error(`Failed to load existing transcription result for video ${videoId}:`, error)
          throw new Error('转写结果不存在，请先完成转写步骤')
        }
      }

      // 第二步：内容翻译
      if (shouldRunTranslation) {
        await storageService.updateVideoStatus(videoId, {
          stage: 'translating',
          progress: 45,
          message: '正在翻译内容...',
          error: '',
        })

        const translator = new Translator(({ stage, status, progress, message, error }) => {
          storageService.updateVideoStatus(videoId, {
            stage,
            status,
            progress,
            message,
            error,
          })
        });

        // 将转写的segments转换为翻译segments
        const translationSegments = convertTranscriptionToTranslationSegments(transcriptionResult.segments)

        translationResult = await translator.translate({
          text: transcriptionResult.text,
          segments: translationSegments,
          sourceLanguage: 'zh-CN',
          targetLanguage: options.targetLanguage || 'en-US',
          provider: 'openai',
        })

        // 保存翻译结果
        await storageService.saveTranslationResult(videoId, translationResult)
      } else {
        // 如果跳过翻译，尝试加载已有的翻译结果
        try {
          translationResult = await storageService.getTranslationResult(videoId)
          if (!translationResult) {
            throw new Error('翻译结果不存在，无法跳过翻译步骤')
          }
        } catch (error) {
          logger.error(`Failed to load existing translation result for video ${videoId}:`, error)
          throw new Error('翻译结果不存在，请先完成翻译步骤')
        }
      }

      // 第三步：语音合成
      if (shouldRunSynthesis) {
        await storageService.updateVideoStatus(videoId, {
          stage: 'synthesizing',
          progress: 65,
          message: '准备语音合成...',
          error: '',
        })

        // 确保我们有翻译结果
        if (!translationResult || !translationResult.segments || translationResult.segments.length === 0) {
          throw new Error('翻译结果不完整，无法进行语音合成')
        }

        // 准备语音合成选项
        const synthesisOptions = {
          provider: options.synthesisProvider || 'edge-tts', // 默认使用 edge-tts，因为不需要 API key
          voiceType: options.voiceType || 'male',
          voice: options.voice, // 如果指定了具体声音，则使用
          speed: options.speed || 1.0,
          outputFormat: 'mp3' as 'mp3' | 'wav',
          combineAudio: true
        }
        const synthesizerService = new SynthesizerService((progress) => {
          storageService.updateVideoStatus(videoId, {
            stage: progress.stage === 'completed' ? 'synthesizing' : progress.stage,
            status: progress.status,
            progress: progress.progress,
            message: progress.message,
            error: progress.error || '',
          })
        })
        // 执行语音合成
        const synthesisResult = await synthesizerService.synthesize(
          videoId,
          translationResult.segments,
          synthesisOptions,

        )

        // 保存语音合成结果
        const resultFile = path.join(
          storageService.getVideoDirectory(videoId),
          'synthesis-result.json'
        )
        await require('fs-extra').writeJson(resultFile, synthesisResult, { spaces: 2 })

        logger.info(`Speech synthesis completed for video: ${videoId}`)
      }

      // TODO: 第四步：视频编辑（当editor模块完成后实现）
      if (shouldRunEditing) {
        await storageService.updateVideoStatus(videoId, {
          stage: 'editing',
          progress: 85,
          message: '视频编辑功能即将上线...',
          error: '',
        })
        // 模拟视频编辑过程
        // await new Promise(resolve => setTimeout(resolve, 10000000000))
      }

      // 更新最终状态
      // await storageService.updateVideoStatus(videoId, {
      //   stage: 'completed',
      //   progress: 100,
      //   message: '视频处理完成',
      //   endTime: new Date().toISOString()
      // })

      // task.progress = 100
      // logger.info(`Video processing completed for video: ${videoId}`)
      throw new Error('pending')
    } catch (error: any) {
      logger.error(`Video processing failed for video ${videoId}:`, error)
      const video = await storageService.getVideoStatus(videoId)
      // 更新错误状态
      await storageService.updateVideoStatus(videoId, {
        stage: 'error',
        progress: video?.progress || 0,
        message: '处理失败',
        error: error.message,
        endTime: new Date().toISOString()
      })

      throw error
    }
  }

}

// 创建单例实例
export const videoProcessingService = new VideoProcessingService() 
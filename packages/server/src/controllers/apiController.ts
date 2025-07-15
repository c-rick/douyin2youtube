import { Request, Response } from 'express'
import { crawlerService } from '../services/crawlerService'
import { databaseService } from '../services/databaseService'
import { Translator } from '../translator'
import { getYouTubeUploader } from '../uploader'
import { logger } from '../utils/logger'
import { VideoMeta, TranslateRequest, UploadRequest } from '../shared/types'
import axios from 'axios'

export class ApiController {

  // 客户端视频播放接口
  async getVideoFile(req: Request, res: Response) {
    try {
      const { id } = req.params
      const video = await databaseService.getVideoById(id)
      if (!video || !video.localPath) {
        res.status(404).json({
          success: false,
          error: '视频文件不存在'
        })
        return
      }

      // 设置合适的Content-Type
      res.setHeader('Content-Type', 'video/mp4')
      // 支持断点续传
      const fs = require('fs')
      const path = require('path')
      const filePath = path.resolve(video.localPath)
      const stat = fs.statSync(filePath)
      const total = stat.size

      if (req.headers.range) {
        // 处理分片请求
        const range = req.headers.range
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1
        const chunkSize = (end - start) + 1
        const file = fs.createReadStream(filePath, { start, end })
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4'
        })
        file.pipe(res)
      } else {
        // 全部文件
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': 'video/mp4'
        })
        fs.createReadStream(filePath).pipe(res)
      }
    } catch (error) {
      logger.error('视频播放失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '视频播放失败'
      })
    }
  }

  // 获取所有视频列表
  async getVideos(req: Request, res: Response) {
    try {
      const videos = await databaseService.getAllVideos()
      res.json({
        success: true,
        data: videos
      })
    } catch (error) {
      logger.error('获取视频列表失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 获取单个视频信息
  async getVideo(req: Request, res: Response) {
    try {
      const { id } = req.params
      const video = await databaseService.getVideoById(id)
      if (!video) {
        res.status(500).json({
          success: false,
          error: '视频不存在'
        })
        return
      }

      res.json({
        success: true,
        data: video
      })
    } catch (error) {
      logger.error('获取视频失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 下载抖音视频
  async downloadVideo(req: Request, res: Response) {
    try {
      let { url } = req.body

      if (!url) {
        res.status(400).json({
          success: false,
          error: '请提供视频URL'
        })
        return
      }

      logger.info(`开始下载视频: ${url}`)
      // 检测是不是抖音视频
      if (!url.includes('douyin.com')) {
        res.status(400).json({
          success: false,
          error: '请提供正确的抖音视频URL'
        })
        return
      }
      // 检测url是否是 https://www.douyin.com/video/7290922811537820928 格式
      if (!url.startsWith('https://www.douyin.com/video/')) {
        // 下载dom页面，拿到div有data-e2e-vid的属性，拿到视频id，然后拼接成 https://www.douyin.com/video/7290922811537820928 格式
        const dom = await axios.get(url)
        const videoId = dom.data.match(/data-e2e-vid="([^"]+)"/)?.[1]
        if (!videoId) {
          res.status(400).json({
            success: false,
            error: '找不到视频'
          })
          return
        }
        url = `https://www.douyin.com/video/${videoId}`
      }

      // 调用crawler服务下载视频
      const result = await crawlerService.crawlVideo(url)

      // 下载完成后自动开始翻译任务
      this.startTranslation(result.id)

      res.json({
        success: true,
        data: result
      })
    } catch (error) {
      logger.error('下载视频失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 自动开始翻译任务
  private async startTranslation(videoId: string) {
    try {
      const video = await databaseService.getVideoById(videoId)
      if (!video) {
        logger.error(`找不到视频: ${videoId}`)
        return
      }

      // 更新状态为翻译中
      await databaseService.updateVideoStatus(videoId, {
        stage: 'translating',
        progress: 50,
        message: '开始翻译标题和描述...'
      })

      logger.info(`开始翻译视频: ${video.title}`)

      // 翻译标题和描述
      const titleToTranslate = video.title
      const descriptionToTranslate = video.description || ''
      const translator = new Translator(async (progress) => {
        await databaseService.updateVideoStatus(videoId, progress)
      })
      const [titleEn, descriptionEn] = await Promise.all([
        translator.translate({
          text: titleToTranslate,
          targetLanguage: 'en',
          sourceLanguage: 'zh'
        }),
        descriptionToTranslate ? translator.translate({
          text: descriptionToTranslate,
          targetLanguage: 'en',
          sourceLanguage: 'zh'
        }) : null
      ])
      logger.info(`翻译完成: ${titleEn.text}, ${descriptionEn?.text}`)
      // 更新视频数据
      const updatedVideo: Partial<VideoMeta> = {
        titleEn: titleEn.text,
        descriptionEn: descriptionEn?.text,
        status: {
          stage: 'idle',
          progress: 80,
          message: '翻译完成'
        }
      }

      await databaseService.updateVideo(videoId, updatedVideo)
      logger.info(`视频翻译完成: ${videoId}`)
    } catch (error) {
      logger.error(`翻译失败: ${videoId}`, error)

      // 更新错误状态
      await databaseService.updateVideoStatus(videoId, {
        stage: 'error',
        progress: 40,
        message: '翻译失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 上传视频到YouTube
  async uploadVideo(req: Request, res: Response) {
    try {
      const { id } = req.params
      const uploadData = req.body as UploadRequest

      const video = await databaseService.getVideoById(id)
      if (!video) {
        res.status(404).json({
          success: false,
          error: '视频不存在'
        })
        return
      }

      if (!video.localPath) {
        res.status(400).json({
          success: false,
          error: '视频文件不存在'
        })
        return
      }

      if (!video.titleEn) {
        res.status(400).json({
          success: false,
          error: '请先翻译视频标题'
        })
        return
      }


      // 上传到YouTube
      const youtubeUploader = getYouTubeUploader()
      const youtubeId = await youtubeUploader.uploadVideo(
        video.localPath,
        {
          videoId: id,
          title: uploadData.title || video.titleEn,
          description: uploadData.description || video.descriptionEn || '',
          tags: uploadData.tags || [],
          privacy: uploadData.privacy || 'public'
        },
        // 进度回调
        async (progress) => {
          await databaseService.updateVideoStatus(id, {
            stage: progress.stage,
            progress: progress.progress,
            message: progress.message,
            error: progress.error
          })
        }
      )

      // 更新视频数据
      await databaseService.updateVideo(id, {
        youtubeId,
        status: {
          stage: 'completed',
          progress: 100,
          message: '上传完成'
        }
      })

      res.json({
        success: true,
        data: {
          youtubeId,
          youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`
        }
      })
    } catch (error) {
      logger.error('上传YouTube失败:', error)

      // 更新错误状态
      await databaseService.updateVideoStatus(req.params.id, {
        stage: 'error',
        progress: 80,
        message: '上传失败',
        error: error instanceof Error ? error.message : '未知错误'
      })

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 删除视频
  async deleteVideo(req: Request, res: Response) {
    try {
      const { id } = req.params
      const removed = await databaseService.deleteVideo(id)
      if (removed) {
        res.json({ success: true })
      } else {
        res.status(404).json({ success: false, error: '视频不存在' })
      }
    } catch (error) {
      logger.error('删除视频失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 获取YouTube授权URL
  async getYouTubeAuthUrl(req: Request, res: Response) {
    try {
      const youtubeUploader = getYouTubeUploader()
      const authUrl = youtubeUploader.authUrl
      res.json({
        success: true,
        data: { authUrl }
      })
    } catch (error) {
      logger.error('获取YouTube授权URL失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 处理YouTube OAuth回调
  async handleYouTubeCallback(req: Request, res: Response) {
    try {
      const { code } = req.query

      if (!code || typeof code !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少授权码'
        })
        return
      }

      const youtubeUploader = getYouTubeUploader()
      const tokens = await youtubeUploader.getTokensFromCode(code)

      res.json({
        success: true,
        data: {
          message: 'YouTube授权成功',
          tokens: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
          }
        }
      })
    } catch (error) {
      logger.error('YouTube授权回调失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 验证YouTube授权状态
  async checkYouTubeAuth(req: Request, res: Response) {
    try {
      const youtubeUploader = getYouTubeUploader()
      const isValid = await youtubeUploader.validateToken()
      res.json({
        success: true,
        data: { isAuthorized: isValid }
      })
    } catch (error) {
      logger.error('检查YouTube授权失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  // 重试视频翻译任务
  async retryTranslate(req: Request, res: Response) {
    try {
      const { id } = req.params
      await this.startTranslation(id)
      res.json({
        success: true,
        message: '已重新开始任务'
      })
    } catch (error) {
      logger.error('重试视频翻译任务失败:', error)
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }
}

export const apiController = new ApiController() 
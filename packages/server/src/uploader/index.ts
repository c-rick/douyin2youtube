import fs from 'fs'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import path from 'path'
import { UploadRequest, UploadProgress } from '../shared/types'
import { logger } from '../utils/logger'
import { databaseService } from '../services/databaseService'
import { loadToken, saveToken } from '../services/youtubeTokenService'

const youtube = google.youtube('v3')

export class YouTubeUploader {
  private oauth2Client: OAuth2Client
  public authUrl: string = ''
  public isAuth: boolean = false

  constructor() {
    logger.info('YouTube init')
    this.oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URL
    )
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
    this.authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // 关键：要获取 refresh_token 必须用 offline
      scope: scopes,
      prompt: 'consent'
    })

    const token = loadToken();
    if (token) {
      this.oauth2Client.setCredentials(token)
      this.oauth2Client.refreshAccessToken()
      this.isAuth = true
    }
  }


  private async updateProgress(videoId: string, stage: UploadProgress['stage'], progress: number, message: string, error?: string) {
    await databaseService.updateVideoStatus(videoId, {
      stage,
      progress,
      message,
      error,
    })
  }

  async uploadVideo(
    videoPath: string,
    metadata: UploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      logger.info(`开始上传视频到YouTube: ${JSON.stringify(metadata)}`)

      this.updateProgress(metadata.videoId, 'uploading', 90, '开始上传到YouTube...')

      if (!fs.existsSync(videoPath)) {
        throw new Error(`视频文件不存在: ${videoPath}`)
      }

      const fileSize = fs.statSync(videoPath).size
      let uploadedBytes = 0

      const response = await youtube.videos.insert({
        auth: this.oauth2Client,
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title: metadata.title,
            description: metadata.description || '',
            tags: metadata.tags || [],
            categoryId: '22', // People & Blogs
            defaultLanguage: 'en',
            defaultAudioLanguage: 'en'
          },
          status: {
            privacyStatus: metadata.privacy || 'public',
            selfDeclaredMadeForKids: false
          }
        },
        media: {
          body: fs.createReadStream(videoPath)
        }
      }, {
        // 上传进度回调
        onUploadProgress: (evt: any) => {
          logger.info('YouTube上传进度:', evt)
          uploadedBytes = evt.bytesRead || 0
          const progress = Math.round((uploadedBytes / fileSize) * 100)
          if (progress > 10) {
            this.updateProgress(metadata.videoId, 'uploading', 90, `上传中... ${progress}%`)
          }
        },
      })

      logger.info('YouTube上传成功:', response.data)
      this.updateProgress(metadata.videoId, 'completed', 100, '上传完成')
      if (!response.data.id) {
        throw new Error('YouTube上传失败: ' + JSON.stringify(response))
      }
      return response.data.id
    } catch (error) {
      logger.error('YouTube上传失败:', error)

      this.updateProgress(metadata.videoId, 'error', 80, '上传失败', error instanceof Error ? error.message : '未知错误')

      throw error
    }
  }

  // 通过授权码获取访问令牌
  async getTokensFromCode(code: string) {
    logger.info('通过授权码获取访问令牌:', code)
    const { tokens } = await this.oauth2Client.getToken(code)
    logger.info('通过授权码获取访问令牌:', tokens)
    this.oauth2Client.setCredentials(tokens)
    this.isAuth = true
    saveToken(tokens)
    return tokens
  }

  // 验证访问令牌是否有效
  async validateToken(): Promise<boolean> {
    try {
      await youtube.channels.list({
        auth: this.oauth2Client,
        part: ['snippet'],
        mine: true
      })
      return true
    } catch (error) {
      logger.error('YouTube token验证失败:', error)
      return false
    }
  }
}
let uploader: YouTubeUploader | null = null
export const getYouTubeUploader = () => {
  if (!uploader) {
    uploader = new YouTubeUploader()
  }
  return uploader
}



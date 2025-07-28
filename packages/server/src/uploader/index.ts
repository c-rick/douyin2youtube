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

    this.initYouTube()
  }

  async initYouTube() {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]

    this.authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // 关键：要获取 refresh_token 必须用 offline
      scope: scopes,
      prompt: 'consent'
    })

    try {
      logger.info('init YouTube server')
      const token = loadToken();
      if (token) {
        this.oauth2Client.setCredentials(token)

        // 设置自动刷新 token 的回调
        this.oauth2Client.on('tokens', (tokens) => {
          logger.info('YouTube token 自动刷新成功')
          if (tokens.refresh_token) {
            // 如果有新的 refresh_token，保存它
            const currentTokens = this.oauth2Client.credentials
            const updatedTokens = {
              ...currentTokens,
              ...tokens
            }
            saveToken(updatedTokens)
          } else {
            // 只更新 access_token
            const currentTokens = this.oauth2Client.credentials
            const updatedTokens = {
              ...currentTokens,
              access_token: tokens.access_token,
              expiry_date: tokens.expiry_date
            }
            saveToken(updatedTokens)
          }
        })

        // 验证 token 是否有效，如果无效会自动尝试刷新
        const isValid = await this.validateAndRefreshToken()
        if (isValid) {
          this.isAuth = true
          logger.info('YouTube token 验证成功')
        } else {
          throw new Error('Token 验证失败且无法刷新')
        }
      }
    } catch (err) {
      logger.error('YouTube token 初始化失败:', err)
      this.deleteToken()
      this.isAuth = false
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

      // 检查标题长度
      if (metadata.title && metadata.title.length > 80) {
        const errorMessage = `标题长度超过限制: ${metadata.title.length}/80 字符。请缩短标题后重试。`
        logger.warn(errorMessage)
        this.updateProgress(metadata.videoId, 'error', 0, '标题过长', errorMessage)
        throw new Error(errorMessage)
      }

      // 在上传前确保 token 有效
      const tokenValid = await this.validateAndRefreshToken()
      if (!tokenValid) {
        const errorMessage = 'YouTube token 无效且无法刷新，请重新授权'
        this.updateProgress(metadata.videoId, 'error', 0, 'Token 无效', errorMessage)
        throw new Error(errorMessage)
      }

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
    } catch (error: any) {
      logger.error('YouTube token验证失败:', error)
    }
    return false
  }

  // 验证并刷新 token
  async validateAndRefreshToken(): Promise<boolean> {
    try {
      // 首先尝试验证当前 token
      const isValid = await this.validateToken()
      if (isValid) {
        return true
      }

      // 如果验证失败，尝试刷新 token
      logger.info('Token 验证失败，尝试刷新...')
      const credentials = this.oauth2Client.credentials

      if (!credentials.refresh_token) {
        logger.error('没有 refresh_token，无法自动刷新')
        return false
      }

      // 刷新 access token
      const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken()
      logger.info('Token 刷新成功')

      // 保存新的 token
      const updatedTokens = {
        ...credentials,
        ...newCredentials
      }
      saveToken(updatedTokens)

      // 再次验证
      return await this.validateToken()

    } catch (error) {
      logger.error('Token 刷新失败:', error)
      return false
    }
  }

  // 删除youtubetoken
  deleteToken() {
    try {
      saveToken(null)
      this.isAuth = false
      logger.info('YouTube token 已删除')
    } catch (err) {
      logger.error('删除 YouTube token 失败', err)
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



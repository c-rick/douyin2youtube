import { promises as fs } from 'fs'
import path from 'path'
import { logger } from '../utils/logger'
import { VideoStatus, StorageManager } from '../types'
import { TranscriptionResult } from '../transcriber/types'
import { TranslatedSegment, TranslationResult } from '../translator/types'
import { VideoMeta } from '../shared/types'

export class FileStorageService implements StorageManager {
  private readonly downloadsDir: string
  private readonly metaFile: string

  constructor(downloadsDir = path.join(process.cwd(), 'data', 'downloads')) {
    this.downloadsDir = path.resolve(downloadsDir)
    this.metaFile = path.join(this.downloadsDir, 'meta.json')
    this.ensureDirectories()
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.downloadsDir, { recursive: true })

      // 创建 meta.json 文件如果不存在
      try {
        await fs.access(this.metaFile)
      } catch {
        await fs.writeFile(this.metaFile, JSON.stringify({ videos: [], lastUpdated: new Date().toISOString() }, null, 2))
      }
    } catch (error) {
      logger.error('Failed to create storage directories:', error)
    }
  }

  async getVideoList(): Promise<VideoMeta[]> {
    try {
      const content = await fs.readFile(this.metaFile, 'utf-8')
      const data = JSON.parse(content)
      return (data.videos || []).sort((a: VideoMeta, b: VideoMeta) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } catch (error) {
      logger.error('Failed to read video list:', error)
      return []
    }
  }

  async getVideoById(id: string): Promise<VideoMeta | null> {
    const videos = await this.getVideoList()
    const video = videos.find(video => video.id === id)
    const segments = await this.getTranscriptionResult(id)
    const translation = await this.getTranslationResult(id)
    return {
      ...video,
      segments: segments?.segments || [],
      translation: translation?.segments || [],
    } as VideoMeta
  }

  async saveVideoMeta(video: VideoMeta): Promise<void> {
    try {
      const videos = await this.getVideoList()
      const existingIndex = videos.findIndex(v => v.id === video.id)

      if (existingIndex >= 0) {
        videos[existingIndex] = { ...videos[existingIndex], ...video }
      } else {
        videos.push(video)
      }

      const data = {
        videos,
        lastUpdated: new Date().toISOString()
      }

      await fs.writeFile(this.metaFile, JSON.stringify(data, null, 2))
      logger.debug(`Video meta saved for ID: ${video.id}`)
    } catch (error) {
      logger.error('Failed to save video meta:', error)
      throw error
    }
  }

  async updateVideoStatus(id: string, status: Partial<VideoStatus>): Promise<void> {
    try {
      const statusFile = path.join(this.downloadsDir, id, 'status.json')
      await fs.mkdir(path.dirname(statusFile), { recursive: true })

      let currentStatus: VideoStatus = {
        id,
        status: 'pending',
        stage: 'idle',
        progress: 0,
        message: ''
      }

      // 读取现有状态
      try {
        const content = await fs.readFile(statusFile, 'utf-8')
        currentStatus = JSON.parse(content)
      } catch {
        // 文件不存在，使用默认状态
      }

      // 更新状态
      const updatedStatus = {
        ...currentStatus,
        ...status,
        id,
        updatedAt: new Date().toISOString()
      }

      await fs.writeFile(statusFile, JSON.stringify(updatedStatus, null, 2))
      logger.debug(`Status updated for video ${id}:`, status)
    } catch (error) {
      logger.error(`Failed to update status for video ${id}:`, error)
      throw error
    }
  }

  async getVideoStatus(id: string): Promise<VideoStatus | null> {
    try {
      const statusFile = path.join(this.downloadsDir, id, 'status.json')
      const content = await fs.readFile(statusFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async createVideoDirectory(id: string): Promise<string> {
    const videoDir = path.join(this.downloadsDir, id)
    await fs.mkdir(videoDir, { recursive: true })
    return videoDir
  }

  getVideoDirectory(id: string): string {
    return path.join(this.downloadsDir, id)
  }

  // 保存转写结果
  async saveTranscriptionResult(videoId: string, result: TranscriptionResult): Promise<void> {
    try {
      const videoDir = this.getVideoDirectory(videoId)
      const transcriptFile = path.join(videoDir, 'transcript.json')

      await fs.writeFile(transcriptFile, JSON.stringify(result, null, 2))
      logger.debug(`Transcription result saved for video: ${videoId}`)
    } catch (error) {
      logger.error(`Failed to save transcription result for video ${videoId}:`, error)
      throw error
    }
  }

  // 获取转写结果
  async getTranscriptionResult(videoId: string): Promise<TranscriptionResult | null> {
    try {
      const videoDir = this.getVideoDirectory(videoId)
      const transcriptFile = path.join(videoDir, 'transcript.json')

      const content = await fs.readFile(transcriptFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  // 保存翻译结果
  async saveTranslationResult(videoId: string, result: TranslationResult): Promise<void> {
    try {
      const videoDir = this.getVideoDirectory(videoId)
      const translationFile = path.join(videoDir, 'translation.json')

      await fs.writeFile(translationFile, JSON.stringify(result, null, 2))
      logger.debug(`Translation result saved for video: ${videoId}`)
    } catch (error) {
      logger.error(`Failed to save translation result for video ${videoId}:`, error)
      throw error
    }
  }

  // 获取翻译结果
  async getTranslationResult(videoId: string): Promise<TranslationResult | null> {
    try {
      const videoDir = this.getVideoDirectory(videoId)
      const translationFile = path.join(videoDir, 'translation.json')

      const content = await fs.readFile(translationFile, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  async updateTranslation(videoId: string, subtitleId: number, translation: string): Promise<void> {
    try {
      const videoDir = this.getVideoDirectory(videoId)

      const translationFile = path.join(videoDir, 'translation.json')
      const content = await fs.readFile(translationFile, 'utf-8')
      const data = JSON.parse(content)
      data.segments.map((segment: TranslatedSegment) => {
        console.log(segment.id === +subtitleId)
        if (segment.id === +subtitleId) {
          segment.translatedText = translation
        }
      })
      await fs.writeFile(translationFile, JSON.stringify(data, null, 2))
    } catch (error) {
      logger.error(`Failed to update translation for video ${videoId}:`, error)
      throw error
    }
  }
}

// 单例实例
export const storageService = new FileStorageService() 
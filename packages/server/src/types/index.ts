
import { ProcessingStage, ProcessingStatus } from '../shared/types'

// 服务器特有的类型定义

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface BaseTask {
  id: string
  progress: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  createdAt: string
  updatedAt: string
  error?: string
}

export interface UploadingTask extends BaseTask {
  videoId: string
  type: 'uploading'
  data?: any
}

export interface VideoProcessingTask extends BaseTask {
  videoId: string
  type: 'processing'
  data?: any
}

export interface CrawlingTask extends BaseTask {
  url: string
  type: 'crawling'
  message: string
  startTime: string
  endTime?: string
  videoId?: string
  options?: any
}
export interface CrawlerStartRequest {
  url: string
  taskId?: string
  options?: {
    downloadCover?: boolean
    outputDir?: string
  }
}



export interface ProcessVideoRequest {
  videoId: string
  options?: {
    targetLanguage?: string
    voiceType?: 'male' | 'female'
    voice?: string
    synthesisProvider?: 'elevenlabs' | 'edge-tts'
    speed?: number
    pitch?: number
    subtitleStyle?: 'bilingual' | 'english' | 'chinese'
    retryFromStep?: 'transcribing' | 'translating' | 'synthesizing' | 'editing' | 'uploading'
  }
}

export interface UploadVideoRequest {
  videoId: string
  metadata: {
    title: string
    description: string
    tags: string[]
    category?: string
    privacy?: 'private' | 'unlisted' | 'public'
  }
}

export interface VideoStatus {
  id: string
  stage: ProcessingStage
  status: ProcessingStatus
  progress: number
  message: string
  error?: string
  startTime?: string
  endTime?: string
  tasks?: VideoProcessingTask[]
}

export interface StorageManager {
  getVideoList(): Promise<any[]>
  getVideoById(id: string): Promise<any | null>
  saveVideoMeta(video: any): Promise<void>
  updateVideoStatus(id: string, status: Partial<VideoStatus>): Promise<void>
  getVideoStatus(id: string): Promise<VideoStatus | null>
}

export interface VideoMetadata {
  id: string
  title: string
  desc?: string
  author: string
  coverUrl?: string
  videoUrl?: string
  duration?: number
  shareUrl?: string
  createTime?: string
  downloadTime: string
  status?: {
    stage: string
    progress: number
    message: string
    error?: string
  }
  localPaths?: {
    video: string
    cover: string
    meta: string
    directory: string
  }
  remotePaths?: {
    video: string
    cover: string
    meta: string
    directory: string
  }
} 
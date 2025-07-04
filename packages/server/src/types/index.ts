
// 服务器特有的类型定义

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface VideoProcessingTask {
  id: string
  videoId: string
  type: 'processing'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  createdAt: string
  updatedAt: string
  data?: any
  error?: string
}

export interface CrawlerStartRequest {
  url: string
  taskId?: string
  options?: {
    downloadCover?: boolean
    outputDir?: string
  }
}

export interface CrawlingTask {
  id: string
  url: string
  type: 'crawling'
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  error?: string
  createdAt: string
  updatedAt: string
  startTime: string
  endTime?: string
  videoId?: string
  options?: any
}

export interface ProcessVideoRequest {
  videoId: string
  options?: {
    targetLanguage?: string
    voiceType?: 'male' | 'female'
    subtitleStyle?: 'bilingual' | 'english' | 'chinese'
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
  stage: 'idle' | 'downloading' | 'transcribing' | 'translating' | 'synthesizing' | 'editing' | 'uploading' | 'completed' | 'error'
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
  localPaths?: string[]
} 
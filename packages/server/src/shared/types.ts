import { z } from 'zod'


// 字幕数据
export const SubtitleSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
})

export const TranslationSchema = z.object({
  start: z.number(),
  end: z.number(),
  originalText: z.string(),
  translatedText: z.string()
})

// 视频元数据
export const VideoMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  coverUrl: z.string(),
  videoUrl: z.string(),
  duration: z.number(),
  shareUrl: z.string(),
  createdAt: z.string(),
  status: z.object({
    stage: z.string(),
    progress: z.number(),
    message: z.string()
  }),
  downloadTime: z.string().optional(),
  localPaths: z.object({
    video: z.string(),
    cover: z.string(),
    meta: z.string(),
    directory: z.string()
  }).optional(),
  remotePaths: z.object({
    video: z.string(),
    cover: z.string(),
    meta: z.string(),
    directory: z.string()
  }).optional(),
  segments: z.array(SubtitleSchema).optional(),
  translation: z.array(TranslationSchema).optional()
})

export type VideoMeta = z.infer<typeof VideoMetaSchema>


export type Subtitle = z.infer<typeof SubtitleSchema>


// 共享的进度类型定义

export type ProcessingStage =
  | 'idle'
  | 'downloading'
  | 'transcribing'
  | 'translating'
  | 'synthesizing'
  | 'editing'
  | 'uploading'
  | 'completed'
  | 'error'
export type CrawlStatus = 'pending' | 'crawling' | 'completed' | 'failed'
export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'

export interface ProcessingProgress {
  stage: ProcessingStage
  status: ProcessingStatus
  progress: number
  message: string
  error?: string
  startTime?: string
  endTime?: string
}

// 转录进度类型（继承自ProcessingProgress）
export interface TranscriptionProgress extends ProcessingProgress {
  stage: 'transcribing' | 'completed' | 'error'
}

// 翻译进度类型（继承自ProcessingProgress）
export interface TranslationProgress extends ProcessingProgress {
  stage: 'translating' | 'completed' | 'error'
}

// 语音合成进度类型
export interface SynthesisProgress extends ProcessingProgress {
  stage: 'synthesizing' | 'completed' | 'error'
}

// 视频编辑进度类型
export interface EditingProgress extends ProcessingProgress {
  stage: 'editing' | 'completed' | 'error'
}

// 上传进度类型
export interface UploadProgress extends ProcessingProgress {
  stage: 'uploading' | 'completed' | 'error'
}

// API 响应
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
})

export type ApiResponse = z.infer<typeof ApiResponseSchema>

// 爬取任务
export interface CrawlingTask {
  id: string
  url: string
  status: CrawlStatus
  progress: number
  startTime: string
  endTime?: string
  result?: any
  error?: string
}

// 爬取请求
export interface CrawlerStartRequest {
  url: string
  taskId?: string
} 
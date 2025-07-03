import { z } from 'zod'

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
  status: z.enum(['pending', 'downloading', 'downloaded', 'processing', 'completed', 'failed'])
})

export type VideoMeta = z.infer<typeof VideoMetaSchema>

// 字幕数据
export const SubtitleSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  translatedText: z.string().optional()
})

export type Subtitle = z.infer<typeof SubtitleSchema>

// 处理状态
export const ProcessingStatusSchema = z.object({
  videoId: z.string(),
  step: z.enum(['transcribe', 'translate', 'synthesize', 'edit', 'upload']),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  error: z.string().optional(),
  result: z.any().optional()
})

export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>

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
  status: 'pending' | 'crawling' | 'completed' | 'failed'
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
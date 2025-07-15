import { z } from 'zod'

// 简化的视频元数据（根据新的三步流程）
export const VideoMetaSchema = z.object({
  id: z.string(),
  title: z.string(),                    // 原标题
  titleEn: z.string().optional(),       // 翻译后的英文标题
  description: z.string().optional(),   // 原描述
  descriptionEn: z.string().optional(), // 翻译后的英文描述
  author: z.string(),
  coverUrl: z.string(),
  videoUrl: z.string(),
  duration: z.number(),
  shareUrl: z.string(),
  createdAt: z.string(),
  status: z.object({
    stage: z.enum(['idle', 'downloading', 'translating', 'uploading', 'completed', 'error']),
    progress: z.number(),
    message: z.string().optional(),
    error: z.string().optional()
  }),
  downloadTime: z.string().optional(),
  localPath: z.string().optional(),     // 本地视频文件路径
  remotePath: z.string().optional(),    // 客户端远程访问的
  youtubeId: z.string().optional(),     // 上传后的YouTube视频ID
  tags: z.array(z.string()).optional()  // YouTube标签
})

export type VideoMeta = z.infer<typeof VideoMetaSchema>

// 简化的处理阶段
export type ProcessingStage = 'idle' | 'downloading' | 'translating' | 'uploading' | 'completed' | 'error'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ProcessingProgress {
  stage: ProcessingStage
  status: ProcessingStatus
  progress: number
  message?: string
  error?: string
  startTime?: string
  endTime?: string
}

// 翻译进度
export interface TranslationProgress extends ProcessingProgress {
  stage: 'translating' | 'completed' | 'error'
}

// 上传进度
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

// 爬取请求
export interface CrawlerStartRequest {
  url: string
  taskId?: string
}

// 翻译请求
export interface TranslateRequest {
  videoId: string
  title?: string
  description?: string
}

// YouTube上传请求
export interface UploadRequest {
  videoId: string
  title: string
  description?: string
  tags?: string[]
  privacy?: 'public' | 'private' | 'unlisted'
} 
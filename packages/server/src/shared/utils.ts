import { VideoMeta, ProcessingStatus } from './types'

// 生成唯一 ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 格式化时间
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 保存视频元数据
export function saveVideoMeta(video: VideoMeta): void {
  // 实现文件保存逻辑
}

// 保存处理状态
export function saveProcessingStatus(status: ProcessingStatus): void {
  // 实现状态保存逻辑
} 
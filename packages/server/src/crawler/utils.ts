import * as fs from 'fs-extra'
import * as path from 'path'
import { VideoMeta } from '../shared/types'

/**
 * 验证抖音分享链接格式
 * @param url 分享链接
 * @returns 是否为有效的抖音链接
 */
export function isValidDouyinUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/v\.douyin\.com\/[a-zA-Z0-9]+/,
    /^https?:\/\/www\.douyin\.com\/video\/\d+/,
    /^https?:\/\/www\.iesdouyin\.com\/share\/video\/\d+/,
    /^https?:\/\/www\.douyin\.com\/share\/video\/\d+/
  ]

  return patterns.some(pattern => pattern.test(url))
}

/**
 * 从抖音分享链接中提取视频 ID
 * @param url 分享链接
 * @returns 视频 ID 或 null
 */
export function extractVideoId(url: string): string | null {
  // 匹配 v.douyin.com 短链接
  const shortMatch = url.match(/v\.douyin\.com\/([a-zA-Z0-9]+)/)
  if (shortMatch) {
    return shortMatch[1]
  }

  // 匹配完整链接中的数字 ID
  const longMatch = url.match(/video\/(\d+)/)
  if (longMatch) {
    return longMatch[1]
  }

  return null
}

/**
 * 获取已下载的视频列表
 * @param downloadsDir 下载目录
 * @returns 视频元数据列表
 */
export async function getDownloadedVideos(downloadsDir: string = './downloads'): Promise<VideoMeta[]> {
  try {
    if (!await fs.pathExists(downloadsDir)) {
      return []
    }

    const entries = await fs.readdir(downloadsDir, { withFileTypes: true })
    const videos: VideoMeta[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = path.join(downloadsDir, entry.name, 'meta.json')
        if (await fs.pathExists(metaPath)) {
          try {
            const meta = await fs.readJson(metaPath)
            videos.push(meta)
          } catch {
            // 忽略损坏的 meta.json 文件
          }
        }
      }
    }

    return videos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

/**
 * 清理文件名中的非法字符
 * @param filename 原始文件名
 * @returns 清理后的文件名
 */
export function sanitizeFilename(filename: string): string {
  // 移除或替换非法字符
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // 替换非法字符为下划线
    .replace(/\s+/g, '_') // 替换连续空格为单个下划线
    .replace(/_{2,}/g, '_') // 替换连续下划线为单个下划线
    .replace(/^_+|_+$/g, '') // 移除开头和结尾的下划线
    .slice(0, 100) // 限制长度
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}

/**
 * 格式化下载速度
 * @param bytesPerSecond 每秒字节数
 * @returns 格式化的速度字符串
 */
export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond)}/s`
}

/**
 * 检查视频文件是否存在且完整
 * @param videoPath 视频文件路径
 * @param expectedSize 期望的文件大小（可选）
 * @returns 文件是否存在且完整
 */
export async function isVideoFileComplete(videoPath: string, expectedSize?: number): Promise<boolean> {
  try {
    if (!await fs.pathExists(videoPath)) {
      return false
    }

    const stats = await fs.stat(videoPath)

    // 检查文件大小
    if (stats.size === 0) {
      return false
    }

    // 如果提供了期望大小，检查是否匹配
    if (expectedSize && Math.abs(stats.size - expectedSize) > 1024) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * 创建视频下载目录结构
 * @param baseDir 基础目录
 * @param videoId 视频 ID
 * @returns 目录路径对象
 */
export async function createVideoDirectories(baseDir: string, videoId: string) {
  const videoDir = path.join(baseDir, videoId)

  await fs.ensureDir(videoDir)

  return {
    root: videoDir,
    video: path.join(videoDir, 'original.mp4'),
    cover: path.join(videoDir, 'cover.jpg'),
    meta: path.join(videoDir, 'meta.json'),
    processed: path.join(videoDir, 'processed'),
    subtitles: path.join(videoDir, 'subtitles'),
    audio: path.join(videoDir, 'audio')
  }
} 
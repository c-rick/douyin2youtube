import axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import { VideoMeta } from '../shared/types'
import { generateId } from '../shared/utils'

const DOUYIN_API_URL = process.env.DOUYIN_API_URL || 'http://localhost:8000'

export interface Evil0ctalApiResponse {
  code: number
  router?: string
  data?: {
    desc?: string
    author?: {
      nickname?: string
      uid?: string
    }
    video?: {
      cover?: {
        url_list?: string[]
      }
      play_addr?: {
        url_list?: string[]
      }
      width?: number
      height?: number
      bitrate?: number
      size?: number
    }
    duration?: number
    create_time?: number
    statistics?: {
      digg_count?: number
      download_count?: number
      play_count?: number
      share_count?: number
      comment_count?: number
    }
    music?: {
      title?: string
      author?: string
      play_url?: string
    }
  }
}

export interface DownloadProgress {
  percentage: number
  downloaded: number
  total: number
  speed: number
}

export interface CrawlerOptions {
  outputDir?: string
  quality?: 'hd' | 'sd'
  downloadCover?: boolean
  downloadMusic?: boolean
  timeout?: number
}

/**
 * 获取抖音视频元数据
 * @param shareUrl 抖音分享链接
 * @param options 爬取选项
 * @returns 视频元数据
 */
export async function fetchDouyinMeta(
  shareUrl: string,
  options: CrawlerOptions = {}
): Promise<VideoMeta> {
  const { timeout = 30000 } = options

  try {
    console.log(`🔍 正在获取视频信息: ${shareUrl}`)

    // 尝试使用 hybrid API
    const response = await axios.get<Evil0ctalApiResponse>(
      `${DOUYIN_API_URL}/api/hybrid/video_data`,
      {
        params: { url: shareUrl },
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Douyin-Crawler/1.0'
        }
      }
    )

    // 检查是否有错误响应
    if (response.data.code !== 200) {
      throw new Error(`API 错误: 解析视频失败`)
    }

    const videoData = response.data.data

    if (!videoData || !videoData.video || !videoData.video.play_addr?.url_list?.length) {
      throw new Error('视频数据不完整或视频已被删除')
    }

    const videoMeta: VideoMeta = {
      id: generateId(),
      title: videoData.desc || '无标题',
      author: videoData.author?.nickname || '未知作者',
      coverUrl: videoData.video.cover?.url_list?.[0] || '',
      videoUrl: videoData.video.play_addr.url_list[0],
      duration: Math.floor((videoData.duration || 0) / 1000),
      shareUrl,
      createdAt: new Date().toISOString(),
      status: 'pending'
    }

    console.log(`✅ 视频信息获取成功: ${videoMeta.title}`)
    console.log(`👤 作者: ${videoMeta.author}`)
    console.log(`⏱️  时长: ${Math.floor(videoMeta.duration / 60)}:${String(videoMeta.duration % 60).padStart(2, '0')}`)

    return videoMeta
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('无法连接到抖音 API 服务，请确保服务已启动 (pnpm run start-douyin-api)')
      }
      if (error.response?.status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      }
      if (error.response?.status && error.response.status >= 500) {
        throw new Error('抖音 API 服务内部错误，请稍后再试')
      }
    }

    // 如果是我们自定义的错误，直接抛出
    if (error instanceof Error) {
      throw error
    }

    throw new Error(`获取抖音视频信息失败: ${String(error)}`)
  }
}


/**
 * 下载视频文件
 * @param videoMeta 视频元数据
 * @param outputPath 输出文件路径
 * @param onProgress 下载进度回调
 * @returns Promise<void>
 */
export async function downloadVideo(
  videoMeta: VideoMeta,
  outputPath: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  try {
    console.log(`📥 开始下载视频: ${videoMeta.title}`)
    console.log(`💾 保存路径: ${outputPath}`)

    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputPath))

    // 如果是模拟数据，创建一个占位文件
    if (videoMeta.videoUrl.includes('placeholder-video.mp4')) {
      console.log(`🧪 检测到模拟数据，创建占位视频文件`)
      const mockContent = `# 模拟视频文件
标题: ${videoMeta.title}
作者: ${videoMeta.author}
时长: ${videoMeta.duration}秒
创建时间: ${videoMeta.createdAt}
分享链接: ${videoMeta.shareUrl}

这是一个用于测试的占位文件，实际项目中会下载真实的视频文件。
`
      await fs.writeFile(outputPath.replace('.mp4', '.txt'), mockContent)
      console.log(`✅ 模拟视频文件创建完成`)
      return
    }

    const response = await axios({
      method: 'GET',
      url: videoMeta.videoUrl,
      responseType: 'stream',
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
        'Referer': 'https://www.douyin.com/'
      }
    })

    const totalSize = parseInt(response.headers['content-length'] || '0', 10)
    let downloadedSize = 0
    let lastTime = Date.now()
    let lastDownloaded = 0

    const writer = fs.createWriteStream(outputPath)

    response.data.pipe(writer)

    response.data.on('data', (chunk: Buffer) => {
      downloadedSize += chunk.length

      // 计算下载进度和速度
      const now = Date.now()
      const timeDiff = now - lastTime
      if (timeDiff >= 1000) {
        const speed = (downloadedSize - lastDownloaded) / (timeDiff / 1000)
        const progress: DownloadProgress = {
          percentage: totalSize ? Math.round((downloadedSize / totalSize) * 100) : 0,
          downloaded: downloadedSize,
          total: totalSize,
          speed
        }
        onProgress?.(progress)
        lastTime = now
        lastDownloaded = downloadedSize
      }
    })

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    throw new Error(`下载视频失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 下载视频封面
 * @param videoMeta 视频元数据
 * @param outputPath 输出文件路径
 * @returns Promise<void>
 */
export async function DownloadCover(videoMeta: VideoMeta, outputPath: string): Promise<void> {
  try {
    console.log(`📥 开始下载封面: ${videoMeta.title}`)
    console.log(`💾 保存路径: ${outputPath}`)

    // 确保输出目录存在
    await fs.ensureDir(path.dirname(outputPath))

    // 如果是模拟数据，创建一个占位文件
    if (videoMeta.coverUrl.includes('placeholder-cover.jpeg')) {
      console.log(`🧪 检测到模拟数据，创建占位封面文件`)
      await fs.writeFile(outputPath.replace('.jpg', '.txt'), '# 这是一个用于测试的占位封面文件')
      console.log(`✅ 模拟封面文件创建完成`)
      return
    }

    const response = await axios({
      method: 'GET',
      url: videoMeta.coverUrl,
      responseType: 'stream',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)',
        'Referer': 'https://www.douyin.com/'
      }
    })

    const writer = fs.createWriteStream(outputPath)
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } catch (error) {
    throw new Error(`下载封面失败: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 爬取抖音视频
 * @param shareUrl 分享链接
 * @param options 爬取选项
 * @returns 视频元数据和文件路径
 */
export async function crawlVideo(
  shareUrl: string,
  options: CrawlerOptions = {}
): Promise<{ videoMeta: VideoMeta, paths: { video: string, cover?: string, meta: string } }> {
  const {
    outputDir = './downloads',
    downloadCover = true,
    quality = 'hd'
  } = options

  try {
    // 获取视频元数据
    const videoMeta = await fetchDouyinMeta(shareUrl, options)

    // 创建输出目录
    const videoDir = path.join(outputDir, videoMeta.id)
    await fs.ensureDir(videoDir)

    // 定义文件路径
    const paths = {
      video: path.join(videoDir, `${quality}.mp4`),
      meta: path.join(videoDir, 'meta.json')
    }

    // 下载视频
    await downloadVideo(videoMeta, paths.video)

    // 保存元数据
    await fs.writeJson(paths.meta, videoMeta, { spaces: 2 })

    // 如果需要下载封面
    if (downloadCover) {
      const coverPath = path.join(videoDir, 'cover.jpg')
      await DownloadCover(videoMeta, coverPath)
        ; (paths as any).cover = coverPath
    }

    return { videoMeta, paths }
  } catch (error) {
    throw new Error(`爬取视频失败: ${error instanceof Error ? error.message : String(error)}`)
  }
} 
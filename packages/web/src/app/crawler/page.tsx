'use client'

import { useState, useEffect } from 'react'
import { useVideoStore, VideoMeta } from '@/stores/videoStore'
import { Download, CheckCircle, AlertCircle, Loader2, Clock, ExternalLink, Edit } from 'lucide-react'
import Link from 'next/link'

export default function CrawlerPage() {
  const [url, setUrl] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadResult, setDownloadResult] = useState<{
    type: 'success' | 'error'
    message: string
    video?: any
  } | null>(null)

  const { downloadVideo, fetchVideos, videos, isLoading } = useVideoStore()
  const [recentVideos, setRecentVideos] = useState<VideoMeta[]>([])

  // 获取视频列表
  useEffect(() => {
    fetchVideos().then((videos) => {
      // 按创建时间排序，最新的在前面
      const sorted = [...videos].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setRecentVideos(sorted)
    })
  }, [fetchVideos])

  const handleDownload = async () => {
    if (!url.trim()) {
      setDownloadResult({
        type: 'error',
        message: '请输入有效的抖音链接'
      })
      return
    }

    setIsDownloading(true)
    setDownloadResult(null)

    try {
      const video = await downloadVideo(url)
      setDownloadResult({
        type: 'success',
        message: '视频下载成功！',
        video
      })
      setUrl('') // 清空输入框

      // 刷新视频列表
      const updatedVideos = await fetchVideos()
      const sorted = [...updatedVideos].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setRecentVideos(sorted)
    } catch (error: any) {
      setDownloadResult({
        type: 'error',
        message: error.message || '下载失败，请重试'
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isDownloading) {
      handleDownload()
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            下载抖音视频
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            输入抖音视频链接，系统会自动下载视频文件和元数据
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主下载区域 */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-700">
              <div className="flex items-center space-x-3 mb-6">
                <Download className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">输入视频链接</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    抖音视频链接
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="请输入抖音视频链接，如：https://v.douyin.com/..."
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                    disabled={isDownloading}
                  />
                </div>

                <button
                  onClick={handleDownload}
                  disabled={isDownloading || !url.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在下载...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>开始下载</span>
                    </>
                  )}
                </button>
              </div>

              {/* 下载结果 */}
              {downloadResult && (
                <div className={`mt-6 p-4 rounded-lg ${downloadResult.type === 'success'
                  ? 'bg-green-900 border border-green-700'
                  : 'bg-red-900 border border-red-700'
                  }`}>
                  <div className="flex items-start space-x-3">
                    {downloadResult.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${downloadResult.type === 'success' ? 'text-green-300' : 'text-red-300'
                        }`}>
                        {downloadResult.message}
                      </p>
                      {downloadResult.video && (
                        <div className="mt-2">
                          <p className="text-sm text-green-300">
                            视频标题：{downloadResult.video.title}
                          </p>
                          <p className="text-sm text-green-300">
                            作者：{downloadResult.video.author}
                          </p>
                          <div className="mt-3">
                            <Link
                              href={`/editor?videoId=${downloadResult.video.id}`}
                              className="inline-flex items-center text-sm font-medium text-blue-400 hover:text-blue-300"
                            >
                              前往编辑处理页面 →
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 使用说明 */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-8 mt-8 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-6">使用说明</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-300">1</span>
                  </div>
                  <div>
                    <p className="text-gray-300">
                      <strong className="text-white">复制链接：</strong>在抖音APP中点击"分享"按钮，复制视频链接
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-300">2</span>
                  </div>
                  <div>
                    <p className="text-gray-300">
                      <strong className="text-white">粘贴链接：</strong>将复制的链接粘贴到上方输入框中
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium text-blue-300">3</span>
                  </div>
                  <div>
                    <p className="text-gray-300">
                      <strong className="text-white">开始下载：</strong>点击"开始下载"按钮，系统会自动处理视频
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 下载历史 */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-white">下载历史</h2>
                </div>
                <button
                  onClick={() => fetchVideos().then(videos => {
                    const sorted = [...videos].sort((a, b) =>
                      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    )
                    setRecentVideos(sorted)
                  })}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                  disabled={isLoading}
                >
                  <Loader2 className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : 'hidden'}`} />
                  刷新
                </button>
              </div>

              {recentVideos.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>暂无下载记录</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {recentVideos.map(video => (
                    <div key={video.id} className="border border-gray-700 rounded-lg p-3 bg-gray-700 hover:bg-gray-600 transition-colors">
                      {video.coverUrl && (
                        <img
                          src={video.coverUrl}
                          alt={video.title}
                          className="w-full h-32 object-cover rounded-md mb-2"
                        />
                      )}
                      <h3 className="font-medium text-white line-clamp-2 mb-1">{video.title}</h3>
                      <p className="text-xs text-gray-300 mb-2">{video.author}</p>

                      <div className="flex items-center text-xs text-gray-300 mb-2">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{formatDate(video.createdAt)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-1 rounded-full ${getDarkStatusColor(video.status.stage)}`}>
                          {getStatusText(video.status.stage)}
                        </span>

                        <div className="flex space-x-1">
                          <Link
                            href={`/editor?videoId=${video.id}`}
                            className="p-1 text-blue-400 hover:text-blue-300 rounded-full hover:bg-gray-500"
                            title="编辑处理"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          {video.shareUrl && (
                            <a
                              href={video.shareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-300 hover:text-white rounded-full hover:bg-gray-500"
                              title="原始链接"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {recentVideos.length > 0 && (
                <div className="mt-4 text-center">
                  <Link
                    href="/editor"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    查看全部视频 →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStatusText(stage: string) {
  const texts: { [key: string]: string } = {
    idle: '等待处理',
    downloading: '正在下载',
    translating: '正在翻译',
    uploading: '正在上传',
    completed: '已完成',
    error: '处理失败'
  }
  return texts[stage] || '未知状态'
}

function getStatusColor(stage: string) {
  const colors: { [key: string]: string } = {
    idle: 'bg-gray-100 text-gray-600',
    downloading: 'bg-blue-100 text-blue-600',
    translating: 'bg-yellow-100 text-yellow-600',
    uploading: 'bg-purple-100 text-purple-600',
    completed: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600'
  }
  return colors[stage] || 'bg-gray-100 text-gray-600'
}

function getDarkStatusColor(stage: string) {
  const colors: { [key: string]: string } = {
    idle: 'bg-gray-700 text-gray-300',
    downloading: 'bg-blue-700 text-blue-300',
    translating: 'bg-yellow-700 text-yellow-300',
    uploading: 'bg-purple-700 text-purple-300',
    completed: 'bg-green-700 text-green-300',
    error: 'bg-red-700 text-red-300'
  }
  return colors[stage] || 'bg-gray-700 text-gray-300'
} 
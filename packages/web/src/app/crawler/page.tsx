'use client'

import { useState, useEffect } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { VideoList } from '../../components/VideoList'
import { Download, Link2, AlertCircle, Clock, CheckCircle, XCircle, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CrawlerPage() {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTasksExpanded, setIsTasksExpanded] = useState(true)
  const [isVideosExpanded, setIsVideosExpanded] = useState(true)

  const {
    videos,
    isLoading,
    crawlingTasks,
    fetchVideos,
    startCrawling,
    startProcessing,
    setCurrentVideo,
    removeCrawlingTask,
    fetchCrawlingTasks
  } = useVideoStore()


  useEffect(() => {
    // 页面加载时获取视频列表
    fetchVideos()
    fetchCrawlingTasks()

  }, [fetchVideos, fetchCrawlingTasks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url.trim()) {
      toast.error('请输入抖音视频链接')
      return
    }

    // 简单的抖音链接验证
    if (!isValidDouyinUrl(url)) {
      toast.error('请输入有效的抖音视频链接')
      return
    }

    setIsSubmitting(true)

    try {
      await startCrawling(url)
      toast.success('爬取任务已启动，请在下方查看进度')
      setUrl('')
      // 确保任务列表是展开的
      setIsTasksExpanded(true)
    } catch (error) {
      console.error('Failed to start crawling:', error)
      toast.error('爬取失败，请检查链接或稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVideoSelect = (video: any) => {
    setCurrentVideo(video)
  }

  const handleStartProcessing = async (videoId: string) => {
    try {
      await startProcessing(videoId)
      toast.success('开始处理视频...')
    } catch (error) {
      console.error('Failed to start processing:', error)
      toast.error('处理失败，请稍后重试')
    }
  }

  const toggleTasks = () => setIsTasksExpanded(!isTasksExpanded)
  const toggleVideos = () => setIsVideosExpanded(!isVideosExpanded)

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          视频爬取
        </h1>
        <p className="text-gray-600">
          输入抖音视频分享链接，自动解析并下载高清无水印视频
        </p>
      </div>

      {/* 输入表单 */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          <Download className="w-5 h-5 inline mr-2" />
          爬取新视频
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              抖音视频链接
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Link2 className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴抖音分享链接，例如：https://v.douyin.com/xxxxx"
                className="input pl-10 w-full"
                disabled={isSubmitting}
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              支持抖音分享短链接、完整链接或带文字的分享内容
            </p>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>请确保链接有效且视频可访问</span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !url.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '爬取中...' : '开始爬取'}
            </button>
          </div>
        </form>
      </div>

      {/* 正在进行的爬取任务 */}
      {crawlingTasks.length > 0 && (
        <div className="card">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={toggleTasks}
          >
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              正在进行的任务 ({crawlingTasks.filter(t => t.status === 'pending' || t.status === 'running').length})
            </h2>
            {isTasksExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>

          {isTasksExpanded && (
            <div className="space-y-3 mt-4">
              {crawlingTasks.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {task.status === 'pending' && (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        {task.status === 'running' && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                        {task.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {task.status === 'failed' && (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}

                        <span className="text-sm font-medium text-gray-900">
                          {task.status === 'pending' && '等待中'}
                          {task.status === 'running' && '进行中'}
                          {task.status === 'completed' && '已完成'}
                          {task.status === 'failed' && '失败'}
                        </span>

                        <span className="text-sm text-gray-500">
                          {new Date(task.startTime).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2 truncate">
                        链接: {task.url}
                      </div>

                      <div className="text-sm text-gray-700">
                        {task.message}
                      </div>

                      {task.error && (
                        <div className="text-sm text-red-600 mt-1">
                          错误: {task.error}
                        </div>
                      )}

                      {(task.status === 'running' || task.status === 'pending') && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {task.progress}%
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={async (e) => {
                        e.stopPropagation() // 防止触发任务列表的展开/折叠
                        try {
                          await removeCrawlingTask(task.id)
                          toast.success('任务已删除')
                        } catch (error) {
                          console.error('Failed to remove task:', error)
                          toast.error(error instanceof Error ? error.message : '删除任务失败')
                        }
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="移除任务"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 视频列表 */}
      <div className="card">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={toggleVideos}
        >
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            已爬取视频 ({videos.length})
          </h2>
          {isVideosExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {isVideosExpanded && (
          <>
            <div className="flex justify-end mt-4 mb-6">
              <button
                onClick={fetchVideos}
                disabled={isLoading}
                className="btn-secondary"
              >
                {isLoading ? '刷新中...' : '刷新列表'}
              </button>
            </div>

            <VideoList
              videos={videos}
              onVideoSelect={handleVideoSelect}
              onStartProcessing={handleStartProcessing}
              showNavigateButton={true}
            />
          </>
        )}
      </div>

      {/* 使用说明 */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          使用说明
        </h3>
        <div className="space-y-2 text-blue-800">
          <p>• 支持所有抖音视频链接格式，包括短链接和完整链接</p>
          <p>• 自动下载最高清晰度的无水印视频</p>
          <p>• 实时显示爬取任务进度和状态</p>
          <p>• 支持同时进行多个爬取任务</p>
          <p>• 爬取完成后可在"编辑处理"页面进行后续操作</p>
        </div>
      </div>
    </div>
  )
}

// 简单的抖音链接验证
function isValidDouyinUrl(url: string): boolean {
  const douyinPatterns = [
    /https?:\/\/v\.douyin\.com\/\w+/,
    /https?:\/\/www\.douyin\.com\/video\/\d+/,
    /https?:\/\/www\.douyin\.com\/share\/video\/\d+/,
  ]

  return douyinPatterns.some(pattern => pattern.test(url)) ||
    url.includes('douyin.com') ||
    url.includes('v.douyin.com')
} 
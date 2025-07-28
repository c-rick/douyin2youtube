'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { API_BASE_URL, useVideoStore, VideoMeta } from '@/stores/videoStore'
import {
  Eye,
  EyeOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Loader2,
  RefreshCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const {
    videos,
    currentVideo,
    isLoading,
    fetchVideos,
    fetchSingleVideo,
    setCurrentVideo,
    retryTranslate,
    uploadToYouTube,
    checkIsAuth,
    deleteVideo
  } = useVideoStore()

  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isVideoListCollapsed, setIsVideoListCollapsed] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    tags: '',
    privacy: 'public' as 'public' | 'private' | 'unlisted'
  })
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)


  useEffect(() => {
    fetchVideos().then(() => {
      const videoId = searchParams.get('videoId')
      if (videoId && videos.length > 0) {
        const video = videos.find(v => v.id === videoId)
        if (video) {
          setCurrentVideo(video)
        }
      } else if (videos.length > 0) {
        setCurrentVideo(videos[0])
      }
    })
  }, [searchParams, fetchVideos])

  // 自动刷新视频列表
  useEffect(() => {
    if (!isAutoRefresh || !currentVideo) return

    const interval = setInterval(async () => {
      if (currentVideo) {
        setRefreshing(currentVideo.id)
        try {
          await fetchSingleVideo(currentVideo.id)
        } finally {
          setRefreshing(null)
        }
      }
    }, 5000) // 每5秒刷新一次

    return () => clearInterval(interval)
  }, [isAutoRefresh, fetchSingleVideo, currentVideo])

  // 处理上传弹框
  const handleUpload = (video: VideoMeta) => {
    checkIsAuth().then((isAuth) => {
      if (!isAuth) {
        window.open(`${API_BASE_URL}/auth`)
      } else {
        setUploadForm({
          title: video.titleEn || video.title,
          description: video.descriptionEn || video.description || '',
          tags: video.tags?.join(', ') || '',
          privacy: 'public'
        })
        setShowUploadForm(true)
      }
    })
  }

  // 提交上传
  const submitUpload = async () => {
    if (!currentVideo) return

    setUploading(currentVideo.id)
    try {
      const tags = uploadForm.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      await uploadToYouTube(currentVideo.id, {
        title: uploadForm.title,
        description: uploadForm.description,
        tags,
        privacy: uploadForm.privacy
      })
      setShowUploadForm(false)
      toast.success('上传成功！')
      // 上传完成后刷新视频列表
      await fetchVideos()
    } catch (error: any) {
      if (error.message.match('No access')) {
        window.open(`${API_BASE_URL}/auth`)
      }
      toast.error('上传失败: ' + error.message)
    } finally {
      setUploading(null)
    }
  }

  // 处理重试翻译
  const handleRetryTranslate = async (video: VideoMeta) => {
    if (!video) return

    setIsRetrying(true)
    try {
      await retryTranslate(video)
      toast.success('已重新开始翻译任务')
      // 立即刷新视频列表
      await fetchVideos()
    } catch (error: any) {
      toast.error(`重试失败: ${error.message || '未知错误'}`)
    } finally {
      setIsRetrying(false)
    }
  }

  // 删除视频
  const handleDeleteVideo = async () => {
    if (!currentVideo) return
    setDeleting(currentVideo.id)
    try {
      await deleteVideo(currentVideo.id)
      toast.success('删除成功')
      setShowDeleteConfirm(false)
      // 删除后自动选中下一个视频
      const idx = videos.findIndex(v => v.id === currentVideo.id)
      if (videos.length > 1) {
        setCurrentVideo(videos[idx === videos.length - 1 ? idx - 1 : idx + 1])
      } else {
        setCurrentVideo(null)
      }
    } catch (error: any) {
      toast.error('删除失败: ' + (error?.message || '未知错误'))
    } finally {
      setDeleting(null)
      fetchVideos()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 px-6 py-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            编辑处理
          </h1>
          <p className="text-gray-300">
            管理已下载的视频，进行翻译和上传操作
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* 自动刷新开关 */}
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isAutoRefresh
              ? 'bg-green-900 text-green-300 hover:bg-green-800'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            title="自动刷新当前视频状态"
          >
            {isAutoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{isAutoRefresh ? '自动刷新中' : '自动刷新'}</span>
          </button>

          {/* 手动刷新按钮 */}
          <button
            onClick={() => fetchVideos()}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-900 text-blue-300 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
            title="刷新所有视频列表"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新全部</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 mt-8">
        {/* 左侧：视频列表 */}
        <div className={`transition-all duration-300 ${isVideoListCollapsed ? 'w-12' : 'w-80'} flex-shrink-0`}>
          <div className={`${isVideoListCollapsed ? '' : 'bg-gray-800 p-4 rounded-lg border border-gray-700'} h-full`}>
            <div className="flex items-center justify-between mb-4">
              {!isVideoListCollapsed && (
                <h2 className="text-xl font-semibold text-white">
                  视频列表 ({videos.length})
                </h2>
              )}
              <button
                onClick={() => setIsVideoListCollapsed(!isVideoListCollapsed)}
                className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
                title={isVideoListCollapsed ? '展开视频列表' : '收起视频列表'}
              >
                {isVideoListCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
              </button>
            </div>

            {!isVideoListCollapsed && (
              <div className="overflow-y-auto max-h-[600px] grid grid-cols-1 gap-2">
                {videos.map((video) => {
                  const isSelected = video.id === currentVideo?.id
                  return (
                    <div
                      key={video.id}
                      onClick={() => setCurrentVideo(video)}
                      className={`cursor-pointer transition-all duration-200 p-2 rounded-lg ${isSelected
                        ? 'border-2 border-blue-500 bg-blue-900 bg-opacity-30'
                        : 'border-2 border-transparent hover:border-gray-600 hover:bg-gray-700'
                        }`}
                    >
                      {video.coverUrl && (
                        <img
                          src={video.coverUrl}
                          alt={video.title}
                          className="w-full h-20 object-cover rounded mb-2"
                        />
                      )}
                      <h4 className="text-sm font-medium text-white line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-xs text-gray-300 mt-1">
                        {video.author}
                      </p>

                      {/* 状态指示器 */}
                      <div className="flex items-center space-x-1 mt-2">
                        {video.status.stage === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {video.status.stage === 'downloading' && (
                          <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        )}
                        {video.status.stage === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                        {video.status.stage === 'idle' && (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-300">
                          {getStatusText(video.status.stage)}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {videos.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 mb-4">还没有视频</p>
                    <a
                      href="/"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      下载视频
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：视频详情 */}
        <div className="flex-1">
          {currentVideo ? (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {currentVideo.title}
                </h2>
                <div className="flex items-center text-gray-300 space-x-4">
                  <span>作者：{currentVideo.author}</span>
                  <span>时长：{Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* 视频预览 */}
              {currentVideo.remotePath ?
                <div className="mb-6">
                  <video
                    key={currentVideo.id} // 添加 key 强制重新渲染
                    className="w-full max-w-md h-auto rounded-lg"
                    controls
                    preload="metadata"
                  >
                    <source src={currentVideo.remotePath} type="video/mp4" />
                    您的浏览器不支持视频播放。
                  </video>
                </div>
                : currentVideo.coverUrl && (
                  <div className="mb-6">
                    <img
                      key={currentVideo.id} // 添加 key 确保图片也能正确更新
                      src={currentVideo.coverUrl}
                      alt={currentVideo.title}
                      className="w-full max-w-md h-auto rounded-lg"
                    />
                  </div>
                )}

              {/* 状态信息 */}
              <div className="mb-6 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  {currentVideo.status.stage === 'completed' && (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                  {currentVideo.status.stage === 'downloading' && (
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  )}
                  {currentVideo.status.stage === 'error' && (
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  )}
                  {currentVideo.status.stage === 'idle' && (
                    <Clock className="w-6 h-6 text-gray-400" />
                  )}

                  <div className="flex-1">
                    <h3 className="font-medium text-white">
                      状态：{getStatusText(currentVideo.status.stage)}
                    </h3>
                    {currentVideo.status.message && (
                      <p className="text-sm text-gray-300">
                        {currentVideo.status.message}
                      </p>
                    )}
                    {currentVideo.status.error && (
                      <p className="text-sm text-red-300">
                        错误：{currentVideo.status.error}
                      </p>
                    )}
                  </div>

                  {/* 刷新指示器 */}
                  {refreshing === currentVideo.id && (
                    <div className="flex items-center text-blue-400">
                      <RefreshCcw className="w-4 h-4 animate-spin mr-1" />
                      <span className="text-xs">刷新中</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-3">
                {/* 翻译信息 */}
                {currentVideo.titleEn && (
                  <div className="p-4 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-800">
                    <h4 className="font-medium text-blue-300 mb-2">翻译后的标题：</h4>
                    <p className="text-blue-100">{currentVideo.titleEn}</p>
                    {currentVideo.descriptionEn && (
                      <>
                        <h4 className="font-medium text-blue-300 mt-3 mb-2">翻译后的描述：</h4>
                        <p className="text-blue-100">{currentVideo.descriptionEn}</p>
                      </>
                    )}
                  </div>
                )}

                {/* YouTube 链接 */}
                {currentVideo.youtubeId && (
                  <div className="p-4 bg-green-900 bg-opacity-50 rounded-lg border border-green-800">
                    <h4 className="font-medium text-green-300 mb-2">已上传至YouTube：</h4>
                    <a
                      href={`https://www.youtube.com/watch?v=${currentVideo.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-300 hover:text-green-200 font-medium"
                    >
                      在YouTube中观看 <Upload className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex space-x-3">
                  {!currentVideo.youtubeId && <button
                    onClick={() => handleUpload(currentVideo)}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg text-center hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    上传到YouTube
                  </button>}

                  {!currentVideo.youtubeId && (
                    <button
                      onClick={() => handleRetryTranslate(currentVideo)}
                      disabled={isRetrying}
                      className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg text-center hover:bg-yellow-700 transition-colors flex items-center justify-center"
                    >
                      {isRetrying ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        '重试翻译'
                      )}
                    </button>
                  )}

                  {currentVideo.youtubeId && (
                    <a
                      href={`https://www.youtube.com/watch?v=${currentVideo.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg text-center hover:bg-red-700 transition-colors"
                    >
                      在YouTube中观看
                    </a>
                  )}
                  {/* 删除按钮 */}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting === currentVideo.id}
                    className="flex-1 bg-gray-700 text-red-300 py-3 px-6 rounded-lg text-center hover:bg-red-800 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {deleting === currentVideo.id ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mr-2" />
                    )}
                    删除视频
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center py-16">
              <Play className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                选择一个视频
              </h3>
              <p className="text-gray-300 mb-6">
                从左侧列表中选择一个视频来查看详细信息
              </p>
              <a
                href="/"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                下载新视频
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 上传弹框 */}
      {showUploadForm && currentVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">上传到YouTube</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="upload-title" className="block text-sm font-medium text-gray-300 mb-1">
                  标题
                </label>
                <input
                  type="text"
                  id="upload-title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="upload-description" className="block text-sm font-medium text-gray-300 mb-1">
                  描述
                </label>
                <textarea
                  id="upload-description"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="upload-tags" className="block text-sm font-medium text-gray-300 mb-1">
                  标签 (用逗号分隔)
                </label>
                <input
                  type="text"
                  id="upload-tags"
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400"
                />
              </div>
              <div>
                <label htmlFor="upload-privacy" className="block text-sm font-medium text-gray-300 mb-1">
                  隐私设置
                </label>
                <select
                  id="upload-privacy"
                  value={uploadForm.privacy}
                  onChange={(e) => setUploadForm({ ...uploadForm, privacy: e.target.value as 'public' | 'private' | 'unlisted' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="public">公开</option>
                  <option value="private">私有</option>
                  <option value="unlisted">未列出</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowUploadForm(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={submitUpload}
                disabled={uploading === currentVideo.id}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {uploading === currentVideo.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>上传中...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    <span>确认上传</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 删除确认弹框 */}
      {showDeleteConfirm && currentVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">确认删除</h3>
            <p className="text-gray-300 mb-6">确定要删除该视频吗？此操作不可恢复。</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleDeleteVideo}
                disabled={deleting === currentVideo.id}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
              >
                {deleting === currentVideo.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
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
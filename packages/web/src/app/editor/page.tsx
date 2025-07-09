'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useVideoStore, VideoMeta } from '../../stores/videoStore'
import { VideoList } from '../../components/VideoList'
import {
  Edit,
  Play,
  Volume2,
  FileText,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Upload,
  RotateCcw,
  Save,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
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
    fetchVideoStatus,
    setCurrentVideo,
    startProcessing,
    retryStep,
    updateVideo,
    apiBaseUrl,
  } = useVideoStore()

  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isVideoListCollapsed, setIsVideoListCollapsed] = useState(false)
  const [expandedTranslation, setExpandedTranslation] = useState(false)
  const [expandedSynthesis, setExpandedSynthesis] = useState(false)

  // 过滤出可以编辑的视频（已下载但未完成处理）
  const editableVideos = videos.filter(video =>
    video.status.stage === 'idle' ||
    video.status.stage === 'transcribing' ||
    video.status.stage === 'translating' ||
    video.status.stage === 'synthesizing' ||
    video.status.stage === 'editing' ||
    video.status.stage === 'completed' ||
    video.status.stage === 'error'
  )

  useEffect(() => {
    fetchVideos().then((videos) => {
      const videoId = searchParams.get('videoId')
      if (videoId && videos.length > 0) {
        const video = videos.find(v => v.id === videoId)
        if (video) {
          setCurrentVideo(video)
          fetchVideoStatus(video.id)
        }
      } else if (videos.length > 0) {
        setCurrentVideo(videos[0])
        fetchVideoStatus(videos[0].id)
      }
    })
  }, [searchParams, fetchVideos])


  // 根据 URL 参数选中视频
  useEffect(() => {


  }, [searchParams, videos])

  // 自动刷新选中视频的状态
  useEffect(() => {
    if (!isAutoRefresh || !currentVideo) return

    const interval = setInterval(() => {
      fetchVideoStatus(currentVideo.id)
    }, 5000) // 每5秒刷新一次选中视频的状态

    return () => clearInterval(interval)
  }, [isAutoRefresh, currentVideo])

  const handleStartProcessing = async (videoId: string) => {
    try {
      toast.success('正在启动处理流程...')
      await startProcessing(videoId)
    } catch (error) {
      console.error('Failed to start processing:', error)
      updateVideo(videoId, {
        status: {
          stage: 'error',
          progress: 0,
          message: '启动处理失败',
          error: error instanceof Error ? error.message : '未知错误'
        }
      })
    }
  }

  const handleRetryStep = async (videoId: string, step: string) => {
    try {
      await retryStep(videoId, step)
      // 立即更新视频状态
      setTimeout(() => {
        fetchVideoStatus(videoId)
      }, 1000)
    } catch (error) {
      console.error('Failed to retry step:', error)
      updateVideo(videoId, {
        status: {
          stage: 'error',
          progress: 0,
          message: '重试失败',
          error: error instanceof Error ? error.message : '未知错误'
        }
      })
    }
  }

  const handleGoToUpload = (videoId: string) => {
    router.push(`/upload?videoId=${videoId}`)
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            编辑处理
          </h1>
          <p className="text-gray-600">
            查看视频处理状态，编辑字幕内容，调整处理参数
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* 自动刷新开关 */}
          <button
            onClick={() => currentVideo && setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!currentVideo
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : isAutoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title={currentVideo ? `自动刷新选中视频 "${currentVideo.title}" 的状态` : '选择视频后可自动刷新状态'}
            disabled={!currentVideo}
          >
            {isAutoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>自动刷新选中视频</span>
          </button>

          {/* 手动刷新选中视频按钮 */}
          {currentVideo && (
            <button
              onClick={() => fetchVideoStatus(currentVideo.id)}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
              title={`刷新视频 "${currentVideo.title}" 的状态`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>刷新选中视频</span>
            </button>
          )}

          {/* 手动刷新所有视频按钮 */}
          <button
            onClick={() => fetchVideos()}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            title="刷新所有视频列表"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新列表</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {/* 左侧：视频列表 */}
        <div className={`transition-all duration-300 ${isVideoListCollapsed ? 'w-12' : 'w-80'
          } flex-shrink-0`}>
          <div className={`${isVideoListCollapsed ? '' : 'card'} h-full`}>
            <div className="flex items-center justify-between mb-4">
              {!isVideoListCollapsed && (
                <h2 className="text-xl font-semibold text-gray-900">
                  视频列表 ({editableVideos.length})
                </h2>
              )}
              <button
                onClick={() => setIsVideoListCollapsed(!isVideoListCollapsed)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
              <div className="overflow-y-auto max-h-[1250px] grid grid-cols-1 gap-2">
                {editableVideos.map((video) => {
                  const isSelected = video.id === currentVideo?.id
                  return (
                    <img
                      key={video.id}
                      onClick={() => {
                        setCurrentVideo(video)
                        fetchVideoStatus(video.id)
                      }}
                      src={video.coverUrl}
                      alt={video.title}
                      className={`w-full h-24 object-cover rounded-lg cursor-pointer transition-all duration-200 ${isSelected
                        ? 'border-2 border-blue-500 p-2 shadow-lg'
                        : 'border-2 border-transparent hover:border-gray-300'
                        }`}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：详细信息和编辑区域 */}
        <div className="flex-1 min-w-0">
          {currentVideo ? (
            <div className="space-y-6">
              {/* 视频信息卡片 */}
              <div className="card">
                <div className="flex items-start space-x-4">
                  <video
                    src={apiBaseUrl + currentVideo.remotePaths?.video || currentVideo.videoUrl}
                    poster={currentVideo.coverUrl}
                    className="w-32 h-24 object-cover rounded-lg cursor-pointer"
                    muted
                    loop
                    onMouseEnter={(e) => {
                      const video = e.target as HTMLVideoElement
                      video.play().catch(() => {
                        // 如果播放失败，静默处理
                      })
                    }}
                    onMouseLeave={(e) => {
                      const video = e.target as HTMLVideoElement
                      video.pause()
                      video.currentTime = 0
                    }}
                    onError={(e) => {
                      // 如果视频加载失败，显示封面图
                      const video = e.target as HTMLVideoElement
                      const img = document.createElement('img')
                      img.src = currentVideo.coverUrl
                      img.alt = currentVideo.title
                      img.className = video.className
                      video.parentNode?.replaceChild(img, video)
                    }}
                  />
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {currentVideo.title}
                    </h2>
                    <p className="text-gray-600 mb-2">{currentVideo.author}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>时长: {formatDuration(currentVideo.duration)}</span>
                      <span>状态: {getStatusText(currentVideo.status.stage)}</span>
                      {currentVideo.status.stage !== 'idle' && currentVideo.status.stage !== 'completed' && (
                        <span>进度: {currentVideo.status.progress}%</span>
                      )}
                      {isAutoRefresh && (
                        <span className="flex items-center text-green-600">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          自动刷新中
                        </span>
                      )}
                    </div>
                    {currentVideo.status.message && (
                      <p className="text-sm text-blue-600 mt-2">
                        {currentVideo.status.message}
                      </p>
                    )}
                    {currentVideo.status.error && (
                      <p className="text-sm text-red-600 mt-2">
                        错误: {currentVideo.status.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 处理概览 */}
              <div className="card">
                <ProcessingOverview
                  video={currentVideo}
                  onStartProcessing={handleStartProcessing}
                  onRetryStep={handleRetryStep}
                  onGoToUpload={handleGoToUpload}
                  expandedTranslation={expandedTranslation}
                  setExpandedTranslation={setExpandedTranslation}
                  expandedSynthesis={expandedSynthesis}
                  setExpandedSynthesis={setExpandedSynthesis}
                />
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Edit className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                请选择视频
              </h3>
              <p className="text-gray-600 mb-4">
                从左侧列表中选择一个视频进行编辑处理
              </p>
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
                <p className="mb-2">💡 <strong>提示：</strong></p>
                <ul className="text-left space-y-1">
                  <li>• 选择视频后可启用自动刷新功能</li>
                  <li>• 自动刷新仅更新选中视频的状态</li>
                  <li>• 处理中的视频状态会实时更新</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 组件：处理概览
function ProcessingOverview({
  video,
  onStartProcessing,
  onRetryStep,
  onGoToUpload,
  expandedTranslation,
  setExpandedTranslation,
  expandedSynthesis,
  setExpandedSynthesis
}: {
  video: any
  onStartProcessing: (videoId: string) => void
  onRetryStep: (videoId: string, step: string) => void
  onGoToUpload: (videoId: string) => void
  expandedTranslation: boolean
  setExpandedTranslation: (expanded: boolean) => void
  expandedSynthesis: boolean
  setExpandedSynthesis: (expanded: boolean) => void
}) {
  const steps = [
    {
      id: 'download',
      stepId: 'downloading',
      name: '视频下载',
      icon: Download,
      status: 'completed',
      description: '从抖音下载原始视频文件'
    },
    {
      id: 'transcribe',
      stepId: 'transcribing',
      name: '语音转写',
      icon: Volume2,
      status: getStepStatus(video.status.stage, 'transcribing', video),
      description: '提取音频并转写为中文字幕'
    },
    {
      id: 'translate',
      stepId: 'translating',
      name: '内容翻译',
      icon: FileText,
      status: getStepStatus(video.status.stage, 'translating', video),
      description: '将中文字幕翻译为英文'
    },
    {
      id: 'synthesize',
      stepId: 'synthesizing',
      name: '语音合成',
      icon: Play,
      status: getStepStatus(video.status.stage, 'synthesizing', video),
      description: '根据英文字幕生成英文语音'
    },
    {
      id: 'edit',
      stepId: 'editing',
      name: '视频编辑',
      icon: Edit,
      status: getStepStatus(video.status.stage, 'editing', video),
      description: '合成视频、字幕和音频'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">处理进度</h3>

        {video.status.stage === 'idle' && (
          <button
            onClick={() => onStartProcessing(video.id)}
            className="btn-primary flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>开始处理</span>
          </button>
        )}

        {video.status.stage === 'error' && (
          <button
            onClick={() => onStartProcessing(video.id)}
            className="btn-secondary flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重新处理</span>
          </button>
        )}

        {/* 处理中断时显示继续按钮 */}
        {video.status.progress > 0 && video.status.progress < 100 && video.status.stage !== 'error' && (
          <button
            onClick={() => onStartProcessing(video.id)}
            className="btn-primary flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>继续处理</span>
          </button>
        )}

        {/* 视频处理完成后显示上传按钮 */}
        {video.status.status === 'completed' && (
          <button
            onClick={() => onGoToUpload(video.id)}
            className="btn-primary flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>去上传</span>
          </button>
        )}
      </div>

      {/* 整体进度条 */}
      {video.status.stage !== 'idle' && video.status.stage !== 'completed' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">整体进度</span>
            <span className="text-sm text-gray-500">{video.status.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${video.status.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActive = step.status === 'processing'
          const canExpand = step.stepId === 'translating' || step.stepId === 'synthesizing'
          const isExpanded = step.stepId === 'translating' ? expandedTranslation :
            step.stepId === 'synthesizing' ? expandedSynthesis : false

          return (
            <div key={step.id} className={`rounded-lg border ${isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}>
              <div className="flex items-center space-x-4 p-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'completed' ? 'bg-green-100 text-green-800' :
                  step.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    step.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                      'bg-red-100 text-red-800'
                  }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : step.status === 'processing' ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : step.status === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium text-gray-900">{step.name}</div>
                      {canExpand && (
                        <button
                          onClick={() => {
                            if (step.stepId === 'translating') {
                              setExpandedTranslation(!expandedTranslation)
                            } else if (step.stepId === 'synthesizing') {
                              setExpandedSynthesis(!expandedSynthesis)
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title={isExpanded ? '收起' : '展开'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {(step.status === 'processing' || step.status === 'error') && step.stepId !== 'downloading' && (
                      <button
                        onClick={() => onRetryStep(video.id, step.stepId)}
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                        title={`重试 ${step.name}`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重试</span>
                      </button>
                    )}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {step.description}
                  </div>

                  <div className="text-sm mt-1">
                    {step.status === 'completed' && (
                      <span className="text-green-600">✓ 已完成</span>
                    )}
                    {step.status === 'processing' && (
                      <span className="text-blue-600">⏳ 处理中...</span>
                    )}
                    {step.status === 'pending' && (
                      <span className="text-gray-500">⏸ 等待中</span>
                    )}
                    {step.status === 'error' && (
                      <span className="text-red-600">❌ 处理失败</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 可展开的内容区域 */}
              {canExpand && isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  {step.stepId === 'translating' && (
                    <SubtitleEditor video={video} />
                  )}
                  {step.stepId === 'synthesizing' && (
                    <VoiceSettings video={video} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 处理日志 */}
      {video.status.stage !== 'idle' && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-2">处理日志</h4>
          <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="text-sm text-gray-600 space-y-1">
              <div>• 视频下载完成</div>
              {video.status.stage !== 'idle' && (
                <div>• {video.status.message}</div>
              )}
              {video.status.error && (
                <div className="text-red-600">• 错误: {video.status.error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// 组件：字幕编辑器（简化版）
function SubtitleEditor({ video }: { video: VideoMeta }) {
  const [subtitles, setSubtitles] = useState(video.segments || [])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const { updateTranslation } = useVideoStore()

  const handleEdit = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const handleSave = (id: string) => {
    setSubtitles(prev => prev.map(sub =>
      sub.id === id ? { ...sub, translation: editText } : sub
    ))
    setEditingId(null)
    setEditText('')
    updateTranslation(video.id, id, editText)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  if (video.status.stage === 'idle' || video.status.stage === 'transcribing') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center">
          <Clock className="w-4 h-4 text-yellow-600 mr-2" />
          <p className="text-sm text-yellow-800">
            字幕内容将在语音转写完成后显示
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">字幕编辑</h4>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2">
        {subtitles.slice(0, 5).map((subtitle) => {
          const translation = video.translation?.find(t => t.id === subtitle.id)
          return (
            <div key={subtitle.id} className="border border-gray-200 rounded p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-mono">
                  {formatTime(subtitle.start)} → {formatTime(subtitle.end)}
                </span>
                {editingId !== subtitle.id && (
                  <button
                    onClick={() => handleEdit(subtitle.id, translation?.translatedText || '')}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    编辑
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-gray-600">
                  <span className="text-xs text-gray-400">原文:</span>
                  <p className="text-xs">{subtitle.text}</p>
                </div>

                <div className="text-gray-600">
                  <span className="text-xs text-gray-400">译文:</span>
                  {editingId === subtitle.id ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full text-xs p-1 border border-gray-300 rounded resize-none"
                        rows={1}
                      />
                      <div className="flex items-center space-x-1 mt-1">
                        <button
                          onClick={() => handleSave(subtitle.id)}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs">{translation?.translatedText}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {subtitles.length > 5 && (
          <div className="text-center text-xs text-gray-500 py-2">
            还有 {subtitles.length - 5} 条字幕...
          </div>
        )}
      </div>
    </div>
  )
}

// 组件：语音设置
function VoiceSettings({ video }: { video: any }) {
  const [settings, setSettings] = useState({
    provider: 'edge-tts',
    voiceType: 'male',
    voice: '',
    speed: 1.0,
    pitch: 0,
    outputFormat: 'mp3'
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    // 这里可以调用API保存设置
    console.log('Saving voice settings:', settings)
    toast.success('语音设置已保存')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">语音设置</h4>
        <button
          onClick={handleSaveSettings}
          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
        >
          保存设置
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            语音引擎
          </label>
          <select
            value={settings.provider}
            onChange={(e) => handleSettingChange('provider', e.target.value)}
            className="w-full text-xs p-1 border border-gray-300 rounded"
          >
            <option value="edge-tts">Edge TTS (免费)</option>
            <option value="elevenlabs">ElevenLabs (需API Key)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            语音类型
          </label>
          <select
            value={settings.voiceType}
            onChange={(e) => handleSettingChange('voiceType', e.target.value)}
            className="w-full text-xs p-1 border border-gray-300 rounded"
          >
            <option value="male">男声</option>
            <option value="female">女声</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            语速
          </label>
          <select
            value={settings.speed}
            onChange={(e) => handleSettingChange('speed', parseFloat(e.target.value))}
            className="w-full text-xs p-1 border border-gray-300 rounded"
          >
            <option value={0.8}>慢 (0.8x)</option>
            <option value={1.0}>正常 (1.0x)</option>
            <option value={1.2}>快 (1.2x)</option>
            <option value={1.5}>很快 (1.5x)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            输出格式
          </label>
          <select
            value={settings.outputFormat}
            onChange={(e) => handleSettingChange('outputFormat', e.target.value)}
            className="w-full text-xs p-1 border border-gray-300 rounded"
          >
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
          </select>
        </div>
      </div>

      {settings.provider === 'elevenlabs' && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-blue-800">
            💡 ElevenLabs 提供更自然的语音，但需要在环境变量中配置 ELEVENLABS_API_KEY
          </p>
        </div>
      )}

      {settings.provider === 'edge-tts' && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-xs text-green-800">
            ✅ Edge TTS 完全免费，无需API密钥，支持多种高质量语音
          </p>
        </div>
      )}
    </div>
  )
}



// 辅助函数
function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function getStatusText(stage: string) {
  const stageMap = {
    'idle': '待处理',
    'downloading': '下载中',
    'transcribing': '转写中',
    'translating': '翻译中',
    'synthesizing': '合成中',
    'editing': '编辑中',
    'completed': '已完成',
    'error': '出错'
  }
  return stageMap[stage as keyof typeof stageMap] || stage
}

function getStepStatus(currentStage: string, stepStage: string, video?: any) {
  const stages = ['idle', 'transcribing', 'translating', 'synthesizing', 'editing', 'completed']
  const currentIndex = stages.indexOf(currentStage)
  const stepIndex = stages.indexOf(stepStage)
  const process = video?.status?.progress
  const stage = video?.status?.stage
  // 特殊处理错误状态
  if (process > 0 && process !== 100) {
    const isError = stage === 'error'
    const isTranscribing = process < 40
    const isTranslating = process >= 40 && process < 60
    const isSynthesizing = process >= 60 && process < 80
    const isEditing = process >= 80 && process < 100
    // 如果没有明确的失败步骤信息，根据进度判断
    if (process > 0) {
      if (stepStage === 'transcribing') return process >= 40 ? 'completed' : 'error'
      if (stepStage === 'translating') return process >= 60 ? 'completed' : (isTranslating && isError) ? 'error' : 'pending'
      if (stepStage === 'synthesizing') return process >= 80 ? 'completed' : (isSynthesizing && isError) ? 'error' : 'pending'
      if (stepStage === 'editing') return process >= 100 ? 'completed' : (isEditing && isError) ? 'error' : 'pending'
    }
    return stepIndex <= currentIndex ? 'error' : 'pending'
  }

  if (currentIndex === -1) return 'pending'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'processing'
  return 'pending'
}

function getLanguageName(code: string) {
  const languages = {
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'es': '西班牙语',
    'fr': '法语'
  }
  return languages[code as keyof typeof languages] || code
}

function getSubtitleStyleName(style: string) {
  const styles = {
    'bilingual': '双语字幕',
    'target-only': '仅目标语言',
    'original-only': '仅原语言',
    'none': '无字幕'
  }
  return styles[style as keyof typeof styles] || style
}

function getQualityName(quality: string) {
  const qualities = {
    'hd': '高清 (1080p)',
    'standard': '标清 (720p)',
    'low': '低画质 (480p)'
  }
  return qualities[quality as keyof typeof qualities] || quality
} 
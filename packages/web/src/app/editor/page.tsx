'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useVideoStore } from '../../stores/videoStore'
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
  ChevronRight
} from 'lucide-react'

export default function EditorPage() {
  const searchParams = useSearchParams()
  const {
    videos,
    currentVideo,
    isLoading,
    fetchVideos,
    setCurrentVideo,
    startProcessing,
    updateVideo
  } = useVideoStore()

  const [selectedTab, setSelectedTab] = useState<'overview' | 'subtitles' | 'settings'>('overview')
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [isVideoListCollapsed, setIsVideoListCollapsed] = useState(false)

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
    fetchVideos()
  }, [fetchVideos])

  // 根据 URL 参数选中视频
  useEffect(() => {
    const videoId = searchParams.get('videoId')
    if (videoId && videos.length > 0) {
      const video = videos.find(v => v.id === videoId)
      if (video) {
        setCurrentVideo(video)
      }
    }
  }, [searchParams, videos, setCurrentVideo])

  // 自动刷新状态
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      fetchVideos()
    }, 5000) // 每5秒刷新一次

    return () => clearInterval(interval)
  }, [isAutoRefresh, fetchVideos])

  const handleStartProcessing = async (videoId: string) => {
    try {
      await startProcessing(videoId)
      // 更新视频状态为转写中
      updateVideo(videoId, {
        status: {
          stage: 'transcribing',
          progress: 0,
          message: '正在启动处理流程...'
        }
      })
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
      // 这里可以添加针对特定步骤的重试逻辑
      await startProcessing(videoId)
    } catch (error) {
      console.error('Failed to retry step:', error)
    }
  }

  const tabs = [
    { id: 'overview', name: '处理概览', icon: Edit },
    { id: 'subtitles', name: '字幕编辑', icon: FileText },
    { id: 'settings', name: '处理设置', icon: Settings }
  ]

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
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isAutoRefresh
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {isAutoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>自动刷新</span>
          </button>

          {/* 手动刷新按钮 */}
          <button
            onClick={() => fetchVideos()}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>刷新</span>
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
              <div className="overflow-y-auto max-h-[calc(100vh-12rem)] grid grid-cols-1 gap-2">
                {editableVideos.map((video) => {
                  const isSelected = video.id === currentVideo?.id
                  return (
                    <img onClick={() => setCurrentVideo(video)} src={video.coverUrl} alt={video.title} className={`w-full h-24 object-cover rounded-lg ${isSelected ? 'border-2 border-gray-600 p-2' : ''}`} />
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
                  <img
                    src={currentVideo.coverUrl}
                    alt={currentVideo.title}
                    className="w-32 h-24 object-cover rounded-lg"
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

              {/* 标签页导航 */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {tabs.map((tab) => {
                    const Icon = tab.icon
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${selectedTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <Icon className="w-4 h-4 inline mr-2" />
                        {tab.name}
                      </button>
                    )
                  })}
                </nav>
              </div>

              {/* 标签页内容 */}
              <div className="card">
                {selectedTab === 'overview' && (
                  <ProcessingOverview
                    video={currentVideo}
                    onStartProcessing={handleStartProcessing}
                    onRetryStep={handleRetryStep}
                  />
                )}
                {selectedTab === 'subtitles' && (
                  <SubtitleEditor video={currentVideo} />
                )}
                {selectedTab === 'settings' && (
                  <ProcessingSettings video={currentVideo} />
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Edit className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                请选择视频
              </h3>
              <p className="text-gray-600">
                从左侧列表中选择一个视频进行编辑处理
              </p>
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
  onRetryStep
}: {
  video: any
  onStartProcessing: (videoId: string) => void
  onRetryStep: (videoId: string, step: string) => void
}) {
  const steps = [
    {
      id: 'download',
      name: '视频下载',
      icon: Download,
      status: 'completed',
      description: '从抖音下载原始视频文件'
    },
    {
      id: 'transcribe',
      name: '语音转写',
      icon: Volume2,
      status: getStepStatus(video.status.stage, 'transcribing'),
      description: '提取音频并转写为中文字幕'
    },
    {
      id: 'translate',
      name: '内容翻译',
      icon: FileText,
      status: getStepStatus(video.status.stage, 'translating'),
      description: '将中文字幕翻译为英文'
    },
    {
      id: 'synthesize',
      name: '语音合成',
      icon: Play,
      status: getStepStatus(video.status.stage, 'synthesizing'),
      description: '根据英文字幕生成英文语音'
    },
    {
      id: 'edit',
      name: '视频编辑',
      icon: Edit,
      status: getStepStatus(video.status.stage, 'editing'),
      description: '合成视频、字幕和音频'
    },
    {
      id: 'upload',
      name: '上传发布',
      icon: Upload,
      status: getStepStatus(video.status.stage, 'uploading'),
      description: '准备上传到YouTube'
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

          return (
            <div key={step.id} className={`flex items-center space-x-4 p-4 rounded-lg border ${isActive ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
              }`}>
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
                  <div className="font-medium text-gray-900">{step.name}</div>
                  {step.status === 'error' && (
                    <button
                      onClick={() => onRetryStep(video.id, step.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
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

// 组件：字幕编辑器
function SubtitleEditor({ video }: { video: any }) {
  const [subtitles, setSubtitles] = useState([
    { id: 1, start: 0, end: 3, original: '大家好，欢迎来到我的频道', translation: 'Hello everyone, welcome to my channel' },
    { id: 2, start: 3, end: 6, original: '今天我们来分享一个有趣的内容', translation: 'Today we are going to share some interesting content' },
    { id: 3, start: 6, end: 9, original: '希望大家能够喜欢', translation: 'Hope you all like it' }
  ])

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')

  const handleEdit = (id: number, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const handleSave = (id: number) => {
    setSubtitles(prev => prev.map(sub =>
      sub.id === id ? { ...sub, translation: editText } : sub
    ))
    setEditingId(null)
    setEditText('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditText('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">字幕编辑</h3>

        <div className="flex items-center space-x-2">
          <button className="btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>导出字幕</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Save className="w-4 h-4" />
            <span>保存修改</span>
          </button>
        </div>
      </div>

      {video.status.stage === 'idle' || video.status.stage === 'transcribing' ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-yellow-800">
              字幕内容将在语音转写完成后显示
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {subtitles.map((subtitle) => (
            <div key={subtitle.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 font-mono">
                  {formatTime(subtitle.start)} → {formatTime(subtitle.end)}
                </span>
                {editingId !== subtitle.id && (
                  <button
                    onClick={() => handleEdit(subtitle.id, subtitle.translation)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    编辑
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-gray-700">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">原文:</span>
                  <p className="mt-1">{subtitle.original}</p>
                </div>

                <div className="text-gray-700">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">译文:</span>
                  {editingId === subtitle.id ? (
                    <div className="mt-1">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md resize-none"
                        rows={2}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => handleSave(subtitle.id)}
                          className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-sm bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1">{subtitle.translation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// 组件：处理设置
function ProcessingSettings({ video }: { video: any }) {
  const [settings, setSettings] = useState({
    targetLanguage: 'en',
    voiceType: 'female',
    voiceModel: 'elevenlabs',
    subtitleStyle: 'bilingual',
    videoQuality: 'hd',
    enableFilters: false
  })

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = () => {
    // 这里可以调用API保存设置
    console.log('Saving settings:', settings)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">处理设置</h3>
        <button
          onClick={handleSaveSettings}
          className="btn-primary flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>保存设置</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 翻译设置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">翻译设置</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标语言
            </label>
            <select
              value={settings.targetLanguage}
              onChange={(e) => handleSettingChange('targetLanguage', e.target.value)}
              className="input"
            >
              <option value="en">英语</option>
              <option value="ja">日语</option>
              <option value="ko">韩语</option>
              <option value="es">西班牙语</option>
              <option value="fr">法语</option>
            </select>
          </div>
        </div>

        {/* 语音设置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">语音设置</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              语音模型
            </label>
            <select
              value={settings.voiceModel}
              onChange={(e) => handleSettingChange('voiceModel', e.target.value)}
              className="input"
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai">OpenAI TTS</option>
              <option value="edge">Edge TTS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              语音类型
            </label>
            <select
              value={settings.voiceType}
              onChange={(e) => handleSettingChange('voiceType', e.target.value)}
              className="input"
            >
              <option value="female">女声</option>
              <option value="male">男声</option>
            </select>
          </div>
        </div>

        {/* 字幕设置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">字幕设置</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              字幕样式
            </label>
            <select
              value={settings.subtitleStyle}
              onChange={(e) => handleSettingChange('subtitleStyle', e.target.value)}
              className="input"
            >
              <option value="bilingual">双语字幕</option>
              <option value="target-only">仅目标语言</option>
              <option value="original-only">仅原语言</option>
              <option value="none">无字幕</option>
            </select>
          </div>
        </div>

        {/* 视频设置 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">视频设置</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              输出质量
            </label>
            <select
              value={settings.videoQuality}
              onChange={(e) => handleSettingChange('videoQuality', e.target.value)}
              className="input"
            >
              <option value="hd">高清 (1080p)</option>
              <option value="standard">标清 (720p)</option>
              <option value="low">低画质 (480p)</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="enableFilters"
              checked={settings.enableFilters}
              onChange={(e) => handleSettingChange('enableFilters', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enableFilters" className="ml-2 block text-sm text-gray-900">
              启用视频滤镜优化
            </label>
          </div>
        </div>
      </div>

      {/* 设置预览 */}
      <div className="border-t pt-6">
        <h4 className="font-medium text-gray-900 mb-3">当前设置预览</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm space-y-1">
            <div>目标语言: {getLanguageName(settings.targetLanguage)}</div>
            <div>语音模型: {settings.voiceModel}</div>
            <div>语音类型: {settings.voiceType === 'female' ? '女声' : '男声'}</div>
            <div>字幕样式: {getSubtitleStyleName(settings.subtitleStyle)}</div>
            <div>视频质量: {getQualityName(settings.videoQuality)}</div>
          </div>
        </div>
      </div>
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
    'uploading': '上传中',
    'completed': '已完成',
    'error': '出错'
  }
  return stageMap[stage as keyof typeof stageMap] || stage
}

function getStepStatus(currentStage: string, stepStage: string) {
  const stages = ['idle', 'transcribing', 'translating', 'synthesizing', 'editing', 'uploading', 'completed']
  const currentIndex = stages.indexOf(currentStage)
  const stepIndex = stages.indexOf(stepStage)

  if (currentStage === 'error') {
    return stepIndex < currentIndex ? 'completed' : 'error'
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
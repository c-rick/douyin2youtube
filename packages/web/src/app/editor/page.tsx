'use client'

import { useState, useEffect } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { VideoList } from '../../components/VideoList'
import { Edit, Play, Volume2, FileText, Settings } from 'lucide-react'

export default function EditorPage() {
  const {
    videos,
    currentVideo,
    isLoading,
    fetchVideos,
    setCurrentVideo,
    startProcessing
  } = useVideoStore()

  const [selectedTab, setSelectedTab] = useState<'overview' | 'subtitles' | 'settings'>('overview')

  // 过滤出可以编辑的视频（已下载但未完成处理）
  const editableVideos = videos.filter(video =>
    video.status.stage === 'idle' ||
    video.status.stage === 'transcribing' ||
    video.status.stage === 'translating' ||
    video.status.stage === 'synthesizing' ||
    video.status.stage === 'editing' ||
    video.status.stage === 'completed'
  )

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  const handleStartProcessing = async (videoId: string) => {
    try {
      await startProcessing(videoId)
    } catch (error) {
      console.error('Failed to start processing:', error)
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          编辑处理
        </h1>
        <p className="text-gray-600">
          查看视频处理状态，编辑字幕内容，调整处理参数
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：视频列表 */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              视频列表 ({editableVideos.length})
            </h2>

            <VideoList
              videos={editableVideos}
              onVideoSelect={setCurrentVideo}
              onStartProcessing={handleStartProcessing}
              selectedVideoId={currentVideo?.id}
            />
          </div>
        </div>

        {/* 右侧：详细信息和编辑区域 */}
        <div className="lg:col-span-2">
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
                      <span>时长: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}</span>
                      <span>状态: {getStatusText(currentVideo.status.stage)}</span>
                    </div>
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
                  <ProcessingOverview video={currentVideo} />
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
function ProcessingOverview({ video }: { video: any }) {
  const steps = [
    { id: 'download', name: '视频下载', status: 'completed' },
    { id: 'transcribe', name: '语音转写', status: getStepStatus(video.status.stage, 'transcribing') },
    { id: 'translate', name: '内容翻译', status: getStepStatus(video.status.stage, 'translating') },
    { id: 'synthesize', name: '语音合成', status: getStepStatus(video.status.stage, 'synthesizing') },
    { id: 'edit', name: '视频编辑', status: getStepStatus(video.status.stage, 'editing') }
  ]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">处理进度</h3>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'completed' ? 'bg-green-100 text-green-800' :
                step.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  step.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                    'bg-red-100 text-red-800'
              }`}>
              {step.status === 'completed' ? '✓' : index + 1}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900">{step.name}</div>
              <div className="text-sm text-gray-500">
                {step.status === 'completed' && '已完成'}
                {step.status === 'processing' && '处理中...'}
                {step.status === 'pending' && '等待中'}
                {step.status === 'error' && '处理失败'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {video.status.stage === 'idle' && (
        <button className="btn-primary w-full">
          开始处理
        </button>
      )}
    </div>
  )
}

// 组件：字幕编辑器
function SubtitleEditor({ video }: { video: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">字幕编辑</h3>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-gray-600 text-center">
          字幕编辑功能开发中...
        </p>
      </div>
    </div>
  )
}

// 组件：处理设置
function ProcessingSettings({ video }: { video: any }) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">处理设置</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            翻译语言
          </label>
          <select className="input">
            <option>英语</option>
            <option>日语</option>
            <option>韩语</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            语音类型
          </label>
          <select className="input">
            <option>女声</option>
            <option>男声</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            字幕样式
          </label>
          <select className="input">
            <option>双语字幕</option>
            <option>仅英文</option>
            <option>仅中文</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// 辅助函数
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
  const stages = ['idle', 'transcribing', 'translating', 'synthesizing', 'editing', 'completed']
  const currentIndex = stages.indexOf(currentStage)
  const stepIndex = stages.indexOf(stepStage)

  if (currentIndex === -1) return 'pending'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) return 'processing'
  return 'pending'
} 
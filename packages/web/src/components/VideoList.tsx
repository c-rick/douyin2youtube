'use client'

import { Play, Clock, User, Calendar } from 'lucide-react'
import { VideoMeta } from '../stores/videoStore'
import { formatDuration, formatDate } from '../utils/format'
import { useRouter } from 'next/navigation'

interface VideoListProps {
  videos: VideoMeta[]
  onVideoSelect?: (video: VideoMeta) => void
  onStartProcessing?: (videoId: string) => void
  selectedVideoId?: string
  showNavigateButton?: boolean
}

export function VideoList({
  videos,
  onVideoSelect,
  onStartProcessing,
  selectedVideoId,
  showNavigateButton = false
}: VideoListProps) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>暂无视频，请先爬取抖音视频</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          isSelected={video.id === selectedVideoId}
          onSelect={() => onVideoSelect?.(video)}
          onStartProcessing={() => onStartProcessing?.(video.id)}
          showNavigateButton={showNavigateButton}
        />
      ))}
    </div>
  )
}

interface VideoCardProps {
  video: VideoMeta
  isSelected: boolean
  onSelect: () => void
  onStartProcessing: () => void
  showNavigateButton?: boolean
}

function VideoCard({ video, isSelected, onSelect, onStartProcessing, showNavigateButton = false }: VideoCardProps) {
  const router = useRouter()
  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'idle': return 'text-gray-600 bg-gray-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }

  const getStatusText = (stage: string) => {
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

  return (
    <div
      className={`card cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
      onClick={onSelect}
    >
      {/* 视频封面 */}
      <div className="relative aspect-video mb-4 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={video.coverUrl}
          alt={video.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder-video.svg'
          }}
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatDuration(video.duration)}
        </div>

        {/* 状态指示器 */}
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status.stage)}`}>
          {getStatusText(video.status.stage)}
        </div>
      </div>

      {/* 视频信息 */}
      <div className="space-y-2">
        <h3 className="font-medium text-gray-900 line-clamp-2" title={video.title}>
          {video.title}
        </h3>

        <div className="flex items-center text-sm text-gray-500">
          <User className="w-4 h-4 mr-1" />
          <span className="truncate">{video.author}</span>
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <Calendar className="w-4 h-4 mr-1" />
          <span>{formatDate(video.createdAt)}</span>
        </div>

        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span>最后更新: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}

        {/* 进度条 */}
        {video.status.stage !== 'idle' && video.status.stage !== 'completed' && video.status.stage !== 'error' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{video.status.message}</span>
              <span>{video.status.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${video.status.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {video.status.stage === 'error' && video.status.error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {video.status.error}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-4 pt-2 border-t">
          {video.status.stage === 'idle' && (
            <>
              {showNavigateButton ? (
                <button
                  className="btn-primary w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    // 跳转到编辑页面并选中当前视频
                    router.push(`/editor?videoId=${video.id}`)
                  }}
                >
                  开始处理
                </button>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    onStartProcessing()
                  }}
                >
                  开始处理
                </button>
              )}
            </>
          )}
          {video.status.stage === 'completed' && (
            <div className="flex space-x-2">
              <button className="btn-secondary flex-1">
                预览视频
              </button>
              <button className="btn-primary flex-1">
                上传 YouTube
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
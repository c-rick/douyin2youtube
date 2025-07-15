import { create } from 'zustand'

export const API_BASE_URL = process.env.SERVER_URL

// 简化的VideoMeta类型（与后端一致）
export interface VideoMeta {
  id: string
  title: string
  titleEn?: string
  description?: string
  descriptionEn?: string
  author: string
  coverUrl: string
  videoUrl: string
  duration: number
  shareUrl: string
  createdAt: string
  status: ProcessingStatus
  localPath?: string
  youtubeId?: string
  tags?: string[]
}

export interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'translating' | 'uploading' | 'completed' | 'error'
  progress: number
  message?: string
  error?: string
}

interface VideoStore {
  // 状态
  videos: VideoMeta[]
  currentVideo: VideoMeta | null
  isLoading: boolean

  // 基础操作
  setVideos: (videos: VideoMeta[]) => void
  addVideo: (video: VideoMeta) => void
  updateVideo: (id: string, updates: Partial<VideoMeta>) => void
  setCurrentVideo: (video: VideoMeta | null) => void
  setLoading: (loading: boolean) => void

  // API 调用
  fetchVideos: () => Promise<VideoMeta[]>
  fetchSingleVideo: (videoId: string) => Promise<VideoMeta | null>
  downloadVideo: (url: string) => Promise<VideoMeta>
  uploadToYouTube: (videoId: string, uploadData: {
    title?: string
    description?: string
    tags?: string[]
    privacy?: 'public' | 'private' | 'unlisted'
  }) => Promise<{ youtubeId: string, youtubeUrl: string }>
  retryTranslate: (video: VideoMeta) => Promise<void>
  // YouTube 授权
  checkIsAuth: () => Promise<boolean>
  deleteVideo: (videoId: string) => Promise<boolean>

}

export const useVideoStore = create<VideoStore>((set, get) => ({
  // 初始状态
  videos: [],
  currentVideo: null,
  isLoading: false,

  // 基础操作
  setVideos: (videos) => set({ videos }),

  addVideo: (video) => set((state) => ({
    videos: [video, ...state.videos]
  })),

  updateVideo: (id, updates) => set((state) => ({
    videos: state.videos.map(video =>
      video.id === id ? { ...video, ...updates } : video
    ),
    currentVideo: state.currentVideo?.id === id
      ? { ...state.currentVideo, ...updates }
      : state.currentVideo
  })),

  setCurrentVideo: (video) => set({ currentVideo: video }),

  setLoading: (loading) => set({ isLoading: loading }),

  // API 调用
  fetchVideos: async () => {
    try {
      set({ isLoading: true })
      const response = await fetch(`${API_BASE_URL}/api/videos`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      set({ videos: result.data })
      return result.data
    } catch (error) {
      console.error('Failed to fetch videos:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSingleVideo: async (videoId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const video = result.data as VideoMeta
        // 更新视频列表中的对应视频
        get().updateVideo(videoId, video)
        return video
      } else {
        return null
      }
    } catch (error) {
      console.error('Failed to fetch single video:', error)
      throw error
    }
  },

  downloadVideo: async (url: string) => {
    try {
      set({ isLoading: true })
      const response = await fetch(`${API_BASE_URL}/api/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Download failed')
      }

      const result = await response.json()

      if (result.success) {
        const video = result.data as VideoMeta
        get().addVideo(video)
        return video
      } else {
        throw new Error(result.error || 'Download failed')
      }
    } catch (error) {
      console.error('Failed to download video:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  uploadToYouTube: async (videoId: string, uploadData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      if (result.success) {
        // 更新本地视频数据
        get().updateVideo(videoId, {
          youtubeId: result.data.youtubeId,
          status: {
            stage: 'completed',
            progress: 100,
            message: '上传完成'
          }
        })
        return result.data
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Failed to upload to YouTube:', error)
      throw error
    }
  },

  retryTranslate: async (video: VideoMeta) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/retry/${video.id}`, {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to retry translate')
      }
    } catch (error) {
      console.error('Failed to retry translate:', error)
      throw error
    }
  },


  checkIsAuth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/youtube/auth-status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        return result.data.isAuthorized
      } else {
        return false
      }
    } catch (error) {
      console.error('Failed to check YouTube auth:', error)
      return false
    }
  },

  // 删除视频
  deleteVideo: async (videoId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/videos/${videoId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }
      const result = await response.json()
      if (result.success) {
        // 本地移除
        set((state) => ({
          videos: state.videos.filter(v => v.id !== videoId),
          currentVideo: state.currentVideo?.id === videoId ? null : state.currentVideo
        }))
        return true
      } else {
        throw new Error(result.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Failed to delete video:', error)
      throw error
    }
  }
})) 
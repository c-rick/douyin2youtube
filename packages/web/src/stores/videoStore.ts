import { create } from 'zustand'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface VideoMeta {
  id: string
  title: string
  desc?: string
  author: string
  coverUrl: string
  videoUrl: string
  duration: number
  createTime?: string
  downloadTime: string
  status: ProcessingStatus
  localPaths?: {
    video?: string
    cover?: string
    meta?: string
    directory?: string
  }
  remotePaths?: {
    video?: string
    cover?: string
    meta?: string
    directory?: string
  }
  segments?: Subtitle[]
  translation?: Translation[]
}

export interface ProcessingStatus {
  stage: 'idle' | 'downloading' | 'transcribing' | 'translating' | 'synthesizing' | 'editing' | 'uploading' | 'completed' | 'error'
  progress: number
  message: string
  error?: string
}

export interface CrawlingTask {
  id?: string
  url: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  message: string
  error?: string
  startTime: string
  endTime?: string
  videoId?: string
}

export interface Subtitle {
  id: string
  start: number
  end: number
  text: string
}

export interface Translation {
  id: string
  start: number
  end: number
  originalText: string
  translatedText: string
}

interface VideoStore {
  // 状态
  videos: VideoMeta[]
  currentVideo: VideoMeta | null
  isLoading: boolean
  crawlingTasks: CrawlingTask[]

  // 操作
  setVideos: (videos: VideoMeta[]) => void
  addVideo: (video: VideoMeta) => void
  updateVideo: (id: string, updates: Partial<VideoMeta>) => void
  updateTranslation: (videoId: string, subtitleId: string, translation: string) => void
  setCurrentVideo: (video: VideoMeta | null) => void
  setLoading: (loading: boolean) => void

  // 任务管理
  addCrawlingTask: (task: CrawlingTask) => void
  updateCrawlingTask: (id: string, updates: Partial<CrawlingTask>) => void
  updateProcessingTask: (id: string, updates: Partial<ProcessingStatus>) => void
  removeCrawlingTask: (id: string) => void
  setCrawlingTasks: (tasks: CrawlingTask[]) => void
  fetchCrawlingTasks: () => Promise<void>

  // API 调用
  fetchVideos: () => Promise<VideoMeta[]>
  fetchVideoStatus: (videoId: string) => Promise<void>
  startCrawling: (url: string) => Promise<void>
  startProcessing: (videoId: string) => Promise<void>
  retryStep: (videoId: string, step: string) => Promise<void>
  uploadToYouTube: (videoId: string, metadata: { title: string, description: string, tags: string[] }) => Promise<void>

  // 轮询
  pollCrawlerTaskStatus: (taskId: string) => Promise<void>

  apiBaseUrl: string
}

let pollingInterval: NodeJS.Timeout | null = null

export const useVideoStore = create<VideoStore>((set, get) => ({
  // 初始状态
  videos: [],
  currentVideo: null,
  isLoading: false,
  crawlingTasks: [],
  apiBaseUrl: API_BASE_URL,

  // 基础操作
  setVideos: (videos) => set({ videos }),

  addVideo: (video) => set((state) => ({
    videos: [...state.videos, video]
  })),

  updateVideo: (id, updates) => set((state) => ({
    videos: state.videos.map(video =>
      video.id === id ? { ...video, ...updates } : video
    ),
    currentVideo: state.currentVideo?.id === id ? { ...state.currentVideo, ...updates } : state.currentVideo
  })),

  setCurrentVideo: (video) => {
    if (video && (video.id === get().currentVideo?.id)) {
      return
    }
    set({ currentVideo: video })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  // 任务管理
  setCrawlingTasks: (tasks) => set({ crawlingTasks: tasks }),

  addCrawlingTask: (task) => set((state) => ({
    crawlingTasks: [task, ...state.crawlingTasks]
  })),

  updateCrawlingTask: (id, updates) => set((state) => ({
    crawlingTasks: state.crawlingTasks.map(task =>
      task.id === id ? { ...task, ...updates } : task
    )
  })),

  updateProcessingTask: (id, updates) => set((state) => ({
    videos: state.videos.map(video =>
      video.id === id ? { ...video, ...updates } : video
    )
  })),

  removeCrawlingTask: async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/tasks/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '删除任务失败')
      }

      // 从本地状态中移除任务
      set((state) => ({
        crawlingTasks: state.crawlingTasks.filter(task => task.id !== id)
      }))
    } catch (error) {
      console.error('Failed to remove crawling task:', error)
      throw error
    }
  },

  // 获取持久化的任务列表
  fetchCrawlingTasks: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/tasks`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && Array.isArray(result.data?.tasks)) {
        // 更新任务列表，但保留正在进行的任务
        const currentTasks = get().crawlingTasks.filter(
          task => task.status === 'pending' || task.status === 'running'
        )

        // 合并服务器返回的任务和正在进行的任务
        const serverTasks = result.data.tasks as CrawlingTask[]
        const mergedTasks = [...currentTasks]

        // 添加服务器返回的任务，避免重复
        serverTasks.forEach(serverTask => {
          if (!mergedTasks.some(task => task.id === serverTask.id)) {
            mergedTasks.push(serverTask)
          }
        })

        // 按开始时间降序排序
        mergedTasks.sort((a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )

        set({ crawlingTasks: mergedTasks })
      } else {
        console.error('API response format error:', result)
      }
    } catch (error) {
      console.error('Failed to fetch crawling tasks:', error)
    }
  },

  // API 调用
  fetchVideos: async () => {
    try {
      set({ isLoading: true })
      const response = await fetch(`${API_BASE_URL}/api/crawler/list`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data?.videos) {
        set({ videos: result.data.videos })
      } else {
        console.error('API response format error:', result)
        set({ videos: [] })
      }
      return result.data.videos
    } catch (error) {
      console.error('Failed to fetch videos:', error)
      set({ videos: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  // 获取单个视频状态
  fetchVideoStatus: async (videoId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/video/${videoId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // 更新对应的视频状态
        const videoData = result.data.video
        const statusData = result.data.status

        if (videoData && statusData) {
          get().updateVideo(videoId, {
            ...videoData,
            status: statusData
          })
        }
      } else {
        console.error('API response format error:', result)
      }
    } catch (error) {
      console.error('Failed to fetch video status:', error)
    }
  },

  startCrawling: async (url: string) => {
    try {
      set({ isLoading: true })
      const tmpTaskId = `task_${Date.now()}`
      const newTask: CrawlingTask = {
        id: tmpTaskId,
        url,
        status: 'pending',
        progress: 0,
        message: '正在启动爬取任务...',
        startTime: new Date().toISOString()
      }

      get().addCrawlingTask(newTask)


      const response = await fetch(`${API_BASE_URL}/api/crawler/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const taskId = result.data.taskId
      if (result.success) {
        // 更新任务状态为运行中
        get().updateCrawlingTask(tmpTaskId, {
          id: taskId,
          status: 'running',
          message: '正在解析视频链接...',
          videoId: result.data?.videoId
        })

        // 开始轮询任务状态
        get().pollCrawlerTaskStatus(taskId)
      } else {
        // 更新任务状态为失败
        get().updateCrawlingTask(taskId, {
          status: 'failed',
          message: result.message || '爬取任务启动失败',
          error: result.message || '未知错误',
          endTime: new Date().toISOString()
        })
        throw new Error(result.message || '爬取任务启动失败')
      }
    } catch (error) {
      console.error('Failed to start crawling:', error)
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  startProcessing: async (videoId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/process/${videoId}`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '处理失败')
      }
      if (result.data.taskId) {
      } else {
        throw new Error(result.message || '处理失败')
      }

      get().fetchVideoStatus(videoId)
    } catch (error) {
      console.error('Failed to start processing:', error)
      throw error
    }
  },

  retryStep: async (videoId: string, step: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/retry/${videoId}/${step}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ options: {} })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '重试失败')
      }
    } catch (error) {
      console.error('Failed to retry step:', error)
      throw error
    }
  },

  uploadToYouTube: async (videoId: string, metadata) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/upload/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || '上传失败')
      }
    } catch (error) {
      console.error('Failed to upload to YouTube:', error)
      throw error
    }
  },

  // 轮询任务状态
  pollCrawlerTaskStatus: async (taskId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/crawler/status/${taskId}`)


      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const taskStatus = result.data
        get().updateCrawlingTask(taskId, taskStatus)

        // 如果任务完成或失败，获取最新的视频列表
        if (taskStatus.status === 'completed' || taskStatus.status === 'error') {
          get().fetchVideos()
        } else {
          setTimeout(() => {
            get().pollCrawlerTaskStatus(taskId)
          }, 3000)
        }
      }
    } catch (error) {
      console.error('Failed to poll task status:', error)
    }
  },


  updateTranslation: async (videoId: string, subtitleId: string, translation: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/translation/${videoId}/${subtitleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation })
      })
      get().fetchVideoStatus(videoId)
    } catch (error) {
      console.error('Failed to update translation:', error)
      throw error
    }
  }

})) 
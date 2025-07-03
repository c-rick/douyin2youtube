'use client'

import { useState, useEffect } from 'react'
import { useVideoStore } from '../../stores/videoStore'
import { VideoList } from '../../components/VideoList'
import { Upload, Youtube, Settings, Tag, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const {
    videos,
    currentVideo,
    fetchVideos,
    setCurrentVideo,
    uploadToYouTube
  } = useVideoStore()

  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    tags: '',
    category: 'Entertainment',
    privacy: 'private'
  })

  const [isUploading, setIsUploading] = useState(false)

  // 过滤出已完成处理的视频
  const completedVideos = videos.filter(video =>
    video.status.stage === 'completed'
  )

  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])

  useEffect(() => {
    if (currentVideo) {
      // 自动填充标题和描述
      setUploadMetadata(prev => ({
        ...prev,
        title: currentVideo.title,
        description: `原视频作者：${currentVideo.author}\n\n${currentVideo.desc || ''}\n\n#抖音翻译 #双语字幕`
      }))
    }
  }, [currentVideo])

  const handleUpload = async () => {
    if (!currentVideo) {
      toast.error('请先选择要上传的视频')
      return
    }

    if (!uploadMetadata.title.trim()) {
      toast.error('请输入视频标题')
      return
    }

    setIsUploading(true)

    try {
      const tags = uploadMetadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag)

      await uploadToYouTube(currentVideo.id, {
        title: uploadMetadata.title,
        description: uploadMetadata.description,
        tags: tags
      })

      toast.success('开始上传到 YouTube...')
    } catch (error) {
      console.error('Failed to upload:', error)
      toast.error('上传失败，请稍后重试')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          上传发布
        </h1>
        <p className="text-gray-600">
          将处理完成的视频上传到 YouTube，设置标题、描述和标签
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：视频列表 */}
        <div className="lg:col-span-1">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              <Youtube className="w-5 h-5 inline mr-2 text-red-600" />
              可上传视频 ({completedVideos.length})
            </h2>

            <VideoList
              videos={completedVideos}
              onVideoSelect={setCurrentVideo}
              selectedVideoId={currentVideo?.id}
            />
          </div>
        </div>

        {/* 右侧：上传设置 */}
        <div className="lg:col-span-2">
          {currentVideo ? (
            <div className="space-y-6">
              {/* 视频预览 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  视频预览
                </h3>
                <div className="flex items-start space-x-4">
                  <img
                    src={currentVideo.coverUrl}
                    alt={currentVideo.title}
                    className="w-48 h-36 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {currentVideo.title}
                    </h4>
                    <p className="text-gray-600 mb-2">作者：{currentVideo.author}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>时长: {Math.floor(currentVideo.duration / 60)}:{(currentVideo.duration % 60).toString().padStart(2, '0')}</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        处理完成
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 上传设置表单 */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Settings className="w-5 h-5 inline mr-2" />
                  上传设置
                </h3>

                <div className="space-y-6">
                  {/* 标题 */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      视频标题 *
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={uploadMetadata.title}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="输入YouTube视频标题"
                      className="input w-full"
                      maxLength={100}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {uploadMetadata.title.length}/100 字符
                    </p>
                  </div>

                  {/* 描述 */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      视频描述
                    </label>
                    <textarea
                      id="description"
                      value={uploadMetadata.description}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="输入视频描述..."
                      rows={6}
                      className="input w-full"
                      maxLength={5000}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {uploadMetadata.description.length}/5000 字符
                    </p>
                  </div>

                  {/* 标签 */}
                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      <Tag className="w-4 h-4 inline mr-1" />
                      标签
                    </label>
                    <input
                      type="text"
                      id="tags"
                      value={uploadMetadata.tags}
                      onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="输入标签，用逗号分隔，例如：抖音翻译,双语字幕,中文视频"
                      className="input w-full"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      用逗号分隔多个标签，最多15个标签
                    </p>
                  </div>

                  {/* 分类和隐私设置 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                        视频分类
                      </label>
                      <select
                        id="category"
                        value={uploadMetadata.category}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                        className="input w-full"
                      >
                        <option value="Entertainment">娱乐</option>
                        <option value="Education">教育</option>
                        <option value="People & Blogs">人物和博客</option>
                        <option value="Comedy">喜剧</option>
                        <option value="Music">音乐</option>
                        <option value="News & Politics">新闻和政治</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="privacy" className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        隐私设置
                      </label>
                      <select
                        id="privacy"
                        value={uploadMetadata.privacy}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, privacy: e.target.value }))}
                        className="input w-full"
                      >
                        <option value="private">私有</option>
                        <option value="unlisted">不公开链接</option>
                        <option value="public">公开</option>
                      </select>
                    </div>
                  </div>

                  {/* 上传按钮 */}
                  <div className="pt-4 border-t">
                    <button
                      onClick={handleUpload}
                      disabled={isUploading || !uploadMetadata.title.trim()}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      {isUploading ? '上传中...' : '上传到 YouTube'}
                    </button>
                  </div>
                </div>
              </div>

              {/* YouTube API 状态 */}
              <div className="card bg-yellow-50 border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-900 mb-3">
                  YouTube API 配置
                </h3>
                <div className="space-y-2 text-yellow-800">
                  <p>• 需要配置 YouTube Data API v3 密钥</p>
                  <p>• 需要完成 OAuth2 授权流程</p>
                  <p>• 首次上传需要验证 Google 账号权限</p>
                </div>
                <button className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors">
                  配置 YouTube API
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Youtube className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                请选择视频
              </h3>
              <p className="text-gray-600">
                从左侧列表中选择一个已完成处理的视频进行上传
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
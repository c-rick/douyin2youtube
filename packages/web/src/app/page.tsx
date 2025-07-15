'use client'

import Link from 'next/link'
import { Download, Edit, Upload, ArrowRight, CheckCircle, Star, Users, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 relative">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-6">
              抖音视频搬运助手
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              简单三步搬运抖音视频到YouTube：下载视频 → 翻译标题 → 上传发布
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/crawler"
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center justify-center shadow-lg shadow-red-500/25"
              >
                <Download className="w-5 h-5 mr-2" />
                开始使用
              </Link>
              <Link
                href="/editor"
                className="bg-gray-800 text-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors border border-gray-700 flex items-center justify-center"
              >
                查看视频
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              功能特色
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              强大的功能，简单的操作，让视频搬运变得轻松高效
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-500/25">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">简单快捷</h3>
              <p className="text-gray-300">
                只需三步即可完成视频搬运，无需复杂操作
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/25">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">智能翻译</h3>
              <p className="text-gray-300">
                AI自动翻译标题描述，适配国际化内容
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">可视化管理</h3>
              <p className="text-gray-300">
                直观的视频管理界面，随时查看处理状态
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">一键上传</h3>
              <p className="text-gray-300">
                集成YouTube API，自动化上传发布流程
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-20 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              使用流程
            </h2>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              三个简单步骤，轻松完成视频搬运
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/25">
                <Download className="w-10 h-10 text-white" />
              </div>
              <div className="bg-gray-800 h-[150px] rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-3">1. 下载视频</h3>
                <p className="text-gray-300 mb-4">
                  输入抖音视频链接，系统自动下载
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/25">
                <Edit className="w-10 h-10 text-white" />
              </div>
              <div className="bg-gray-800 h-[150px] rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-3">2. 编辑翻译</h3>
                <p className="text-gray-300 mb-4">
                  使用AI自动翻译视频标题和描述为英文
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
                <Upload className="w-10 h-10 text-white" />
              </div>
              <div className="bg-gray-800 h-[150px] rounded-lg p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-3">3. 上传发布</h3>
                <p className="text-gray-300 mb-4">
                  一键上传到YouTube平台，完成视频搬运
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
} 
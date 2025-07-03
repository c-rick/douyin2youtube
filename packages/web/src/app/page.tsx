'use client'

import Link from 'next/link'
import { Download, Edit, Upload, Play, Clock, CheckCircle } from 'lucide-react'

export default function HomePage() {
  const features = [
    {
      icon: Download,
      title: '视频爬取',
      description: '支持抖音分享链接解析，自动下载高清无水印视频',
      href: '/crawler',
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: Edit,
      title: '智能处理',
      description: '自动转写、翻译、配音合成，生成双语字幕视频',
      href: '/editor',
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Upload,
      title: '一键上传',
      description: '自动上传至 YouTube，设置标题、描述和标签',
      href: '/upload',
      color: 'text-purple-600 bg-purple-50'
    }
  ]


  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          抖音翻译搬运助手
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          一站式解决方案，自动化抖音视频爬取、翻译、配音、合成并上传至 YouTube
        </p>
        <Link href="/crawler" className="btn-primary text-lg px-8 py-3">
          开始使用
        </Link>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Link key={feature.title} href={feature.href}>
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Workflow */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          处理流程
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-4">
          {[
            { step: 1, title: '粘贴链接', desc: '输入抖音分享链接' },
            { step: 2, title: '自动下载', desc: '解析并下载视频' },
            { step: 3, title: '智能处理', desc: '转写翻译配音合成' },
            { step: 4, title: '上传发布', desc: '自动上传至YouTube' }
          ].map((item, index) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                {item.step}
              </div>
              <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
              {index < 3 && (
                <div className="hidden md:block absolute transform translate-x-16">
                  <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            快速开始
          </h3>
          <div className="space-y-3">
            <Link href="/crawler" className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Download className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">爬取新视频</div>
                  <div className="text-sm text-gray-600">输入抖音链接开始下载</div>
                </div>
              </div>
            </Link>
            <Link href="/editor" className="block p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <Edit className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">处理视频</div>
                  <div className="text-sm text-gray-600">查看和编辑已下载的视频</div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            系统状态
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">抖音 API</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">翻译服务</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                正常
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">YouTube API</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                未配置
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
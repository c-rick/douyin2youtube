'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Download, Edit, Upload, Home } from 'lucide-react'
import { clsx } from 'clsx'
import { useMediaQuery } from 'react-responsive'

const navItems = [
  {
    name: '首页',
    href: '/',
    icon: Home
  },
  {
    name: '下载视频',
    href: '/crawler',
    icon: Download
  },
  {
    name: '编辑处理',
    href: '/editor',
    icon: Edit
  }
]

export function Navigation() {
  const pathname = usePathname()
  const isMobile = useMediaQuery({ query: '(max-width: 767px)' })
  return (
    <nav className={`bg-gray-800 border-b border-gray-700 backdrop-blur-sm  ${isMobile ? '' : 'sticky top-0 z-10'}`} >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img src="/logo.svg" alt="d2y" className="w-20 h-8" />
            </div>
          </div>

          {/* 导航链接 */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-red-500 text-white '
                      : 'border-transparent text-gray-300 hover:border-red-400 hover:text-red-400'
                  )}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav >
  )
} 
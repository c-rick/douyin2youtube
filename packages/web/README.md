# 抖音翻译搬运助手 - Web 控制台

基于 Next.js 的前端可视化控制台，提供完整的视频处理流程管理界面。

## 🎯 功能特性

### 📱 页面结构
- **首页** (`/`) - 项目概览、快速操作、系统状态
- **视频爬取** (`/crawler`) - 抖音链接解析和视频下载
- **编辑处理** (`/editor`) - 视频处理状态查看和字幕编辑
- **上传发布** (`/upload`) - YouTube 上传和元数据设置

### 🎨 UI 组件
- **VideoList** - 响应式视频列表展示
- **Navigation** - 主导航栏
- **状态管理** - Zustand 全局状态
- **通知系统** - React Hot Toast

### ⚡ 技术栈
- **框架**: Next.js 14 (App Router)
- **样式**: TailwindCSS + 自定义组件样式
- **状态管理**: Zustand
- **图标**: Lucide React
- **通知**: React Hot Toast
- **类型安全**: TypeScript

## 🚀 开发指南

### 启动开发服务器
```bash
pnpm dev
```

### 构建生产版本
```bash
pnpm build
```

### 项目结构
```
src/
├── app/                    # Next.js App Router 页面
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   ├── crawler/           # 爬取页面
│   ├── editor/            # 编辑页面
│   └── upload/            # 上传页面
├── components/            # 可复用组件
│   ├── VideoList.tsx      # 视频列表
│   └── Navigation.tsx     # 导航栏
├── stores/               # Zustand 状态管理
│   └── videoStore.ts     # 视频状态存储
└── utils/                # 工具函数
    └── format.ts         # 格式化函数
```

## 🎯 主要功能

### 1. 视频爬取页面
- 抖音链接输入和验证
- 自动解析视频信息
- 下载进度展示
- 已爬取视频列表

### 2. 编辑处理页面
- 视频处理状态跟踪
- 分步骤进度显示
- 字幕编辑界面（开发中）
- 处理参数配置

### 3. 上传发布页面
- YouTube 元数据编辑
- 视频预览
- 标签和分类设置
- 隐私权限配置

## 📊 状态管理

使用 Zustand 管理应用状态：

```typescript
interface VideoStore {
  videos: VideoMeta[]           // 视频列表
  currentVideo: VideoMeta       // 当前选中视频
  isLoading: boolean           // 加载状态
  
  // API 操作
  fetchVideos: () => Promise<void>
  startCrawling: (url: string) => Promise<void>
  startProcessing: (videoId: string) => Promise<void>
  uploadToYouTube: (videoId: string, metadata: any) => Promise<void>
}
```

## 🎨 样式系统

### TailwindCSS 自定义类
```css
.btn-primary     /* 主要按钮样式 */
.btn-secondary   /* 次要按钮样式 */
.card           /* 卡片容器样式 */
.input          /* 输入框样式 */
```

### 响应式设计
- 移动优先的响应式布局
- 自适应网格系统
- 触摸友好的交互设计

## 🔗 API 集成

前端通过 REST API 与后端通信：

```typescript
// 爬取视频
POST /api/crawler/start
{ url: string }

// 获取视频列表
GET /api/crawler/list

// 开始处理
POST /api/process/:id

// 上传到 YouTube
POST /api/upload/:id
{ title, description, tags }
```

## 📱 移动端适配

- 响应式导航栏
- 触摸优化的操作按钮
- 移动端友好的表单设计
- 自适应视频卡片布局

## 🔮 后续开发计划

- [ ] 实时状态更新（WebSocket）
- [ ] 字幕编辑器完整实现
- [ ] 视频预览播放器
- [ ] 批量操作支持
- [ ] 深色模式
- [ ] 国际化支持 
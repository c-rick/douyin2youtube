# 📦 抖音视频搬运助手（简化版）

一个简化的视频搬运工具：**下载抖音视频** → **翻译标题** → **上传至 YouTube**，配备前端可视化控制台。

## ✨ 核心特性

- 🚀 **三步简化流程**：下载 → 翻译 → 上传
- 🌍 **智能翻译**：支持 OpenAI GPT-4o 和 DeepL
- 📱 **可视化界面**：Next.js 前端控制台
- ⚡ **高效架构**：Monorepo + TypeScript + 现代工具链
- 🎯 **专注核心**：移除复杂的音视频处理，仅保留下载、翻译、上传

## 🛠️ 技术栈

- **构建系统**: Turbo (高效 monorepo 管理)
- **包管理**: pnpm (快速、节省空间)
- **前端**: Next.js + TailwindCSS + TypeScript + Zustand
- **后端**: Express/Koa + TypeScript  
- **爬虫**: Evil0ctal 抖音 API（仅保留 douyin/tiktok 相关）
- **翻译**: OpenAI GPT-4o / DeepL
- **上传**: YouTube Data API v3
- **存储**: 本地 JSON 文件

## 📁 项目结构

```
douyin2youtube/
├── packages/
│   ├── web/                 # 前端可视化控制台（Next.js）
│   │   ├── src/app/
│   │   │   ├── crawler/     # 下载页面
│   │   │   ├── editor/      # 视频管理、翻译、上传唯一入口
│   │   └── src/stores/      # Zustand 状态管理
│   └── server/              # 后端服务（Express/Koa）
│       ├── src/
│       │   ├── crawler/     # 抖音视频下载
│       │   ├── translator/  # 标题翻译模块
│       │   ├── uploader/    # YouTube 上传模块
│       │   ├── services/    # 核心业务服务
│       │   └── shared/      # 公共类型定义
│       └── data/
│           ├── db.json      # 视频数据存储
│           └── downloads/   # 视频文件存储
├── external/
│   └── douyin-api/          # Evil0ctal API（仅需 douyin/tiktok 相关，其它可忽略）
└── scripts/                 # 启动脚本
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 克隆项目
git clone <repository-url>
cd douyin2youtube

# 初始化子模块
git submodule update --init --recursive
```

### 2. 安装依赖

```bash
# 安装项目依赖
pnpm install

# 安装 Python 依赖（抖音 API）
cd external/douyin-api
pip install -r requirements.txt
cd ../..
```

### 3. 环境配置

```bash
# 复制环境变量文件
cp env.example .env
cp packages/server/env.example packages/server/.env
```

在 `.env` 文件中配置必要的 API 密钥：

```env
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key

# YouTube 配置  
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# DeepL 配置（可选）
DEEPL_API_KEY=your_deepl_api_key
```

### 4. 启动服务

```bash
# 启动抖音 API 服务
pnpm run start-douyin-api

# 开发模式（前端 + 后端）
pnpm dev

# 或者分别启动
pnpm dev:server   # 后端：http://localhost:3001
pnpm dev:web      # 前端：http://localhost:3000
```

### 5. 访问服务

- **前端控制台**: http://localhost:3000
- **后端 API**: http://localhost:3001
- **抖音 API 文档**: http://localhost:8000/docs

## 🎯 使用流程

### 第一步：下载抖音视频

1. 访问下载页面：http://localhost:3000/crawler
2. 粘贴抖音分享链接，点击「下载视频」
3. 下载完成后自动进入管理页面

### 第二步：翻译视频标题

1. 前往「编辑/管理」页面：http://localhost:3000/editor
2. 找到刚下载的视频卡片
3. 点击「自动翻译」按钮，系统自动翻译标题和描述为英文

### 第三步：上传到 YouTube

1. 在视频卡片上点击「上传到 YouTube」
2. 首次使用需要 Google OAuth 授权
3. 设置视频标题、描述、标签等
4. 点击上传，等待完成

> **所有视频管理、翻译、上传操作均在 `/editor` 页面完成，原 `/videos`、`/upload` 页面已合并。**

## 📊 数据结构

### VideoMeta 类型

```typescript
interface VideoMeta {
  id: string                // 唯一标识
  title: string            // 原标题
  titleEn: string         // 英文标题
  description: string     // 原描述  
  descriptionEn: string   // 英文描述
  author: string          // 作者
  coverUrl: string        // 封面URL
  videoUrl: string        // 视频URL
  localPath: string       // 本地路径
  
  status: {
    stage: 'idle' | 'downloading' | 'translating' | 'uploading' | 'completed' | 'error'
    progress: number
    message?: string
  }
  
  youtubeId?: string      // YouTube 视频ID
  createdAt: string       // 创建时间
}
```

## 🔌 API 接口

| 路由 | 方法 | 描述 |
|------|------|------|
| `/api/videos` | GET | 获取所有视频列表 |
| `/api/download` | POST | 下载抖音视频 |
| `/api/translate/:id` | POST | 翻译视频标题和描述 |
| `/api/upload/:id` | POST | 上传到 YouTube |
| `/api/status/:id` | GET | 查询视频处理状态 |

### YouTube 授权 API

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/youtube/auth` | GET | 获取授权URL |
| `/api/youtube/callback` | GET | OAuth 回调处理 |
| `/api/youtube/status` | GET | 检查授权状态 |

## 🛠️ 开发脚本

```bash
# 开发模式
pnpm dev                # 启动前端 + 后端
pnpm dev:web           # 仅前端开发
pnpm dev:server        # 仅后端开发

# 构建
pnpm build             # 构建所有包
pnpm build:web         # 构建前端
pnpm build:server      # 构建后端

# 抖音 API 管理
pnpm start-douyin-api  # 启动抖音 API
pnpm stop-douyin-api   # 停止抖音 API

# 生产环境
pnpm start             # 启动生产服务

# 维护工具
pnpm clean             # 清理构建文件
pnpm lint              # 代码检查
pnpm type-check        # 类型检查
```

## ✅ 开发进度

### 已完成功能
- ✅ **项目结构** - Monorepo + TypeScript 配置
- ✅ **视频下载** - 集成 Evil0ctal 抖音 API
- ✅ **标题翻译** - OpenAI GPT-4o 和 DeepL 支持
- ✅ **YouTube 上传** - Google API OAuth 认证
- ✅ **前端界面** - Next.js 可视化控制台
- ✅ **状态管理** - Zustand 全局状态
- ✅ **数据持久化** - JSON 文件存储
- ✅ **页面合并** - 所有管理操作统一在 `/editor` 页面

## 🎨 页面预览

- **下载页面**：粘贴链接一键下载，显示下载历史
- **编辑/管理页面**：视频卡片列表，自动翻译、上传、删除等操作，所有管理功能集中于此


## 🔧 故障排除

### 常见问题

**1. 抖音 API 启动失败**
```bash
# 检查 Python 环境
python --version
pip install -r external/douyin-api/requirements.txt

# 手动启动测试
cd external/douyin-api
python start.py
```

**2. YouTube 授权失败**
- 检查 Google Cloud Console 配置
- 确认回调 URL 设置正确
- 验证 OAuth 客户端密钥

**3. 翻译 API 错误**
- 检查 OpenAI API Key 是否有效
- 确认 API 余额充足
- 验证网络连接

### 日志查看

```bash
# 查看后端日志
cd packages/server
npm run dev

# 查看抖音 API 日志
cd external/douyin-api
tail -f logs/api.log
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## ⚠️ 免责声明

本项目仅供学习交流使用，请确保：

- 遵守相关平台的使用条款
- 获得原始视频作者授权
- 不传播版权内容或敏感信息
- 合理使用 API 配额

## 🌟 致谢

- [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) - 抖音下载 API
- [OpenAI](https://openai.com/) - GPT-4o 翻译服务
- [Google](https://developers.google.com/youtube/v3) - YouTube Data API v3 
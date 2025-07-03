# 抖音翻译搬运助手 - 后端服务

基于 Koa.js 的后端 API 服务，提供视频爬取、处理和上传等功能。

## 功能特性

- 🎥 **视频爬取**: 从抖音链接爬取视频和元数据
- 🔄 **任务队列**: 基于内存的任务调度系统
- 📁 **文件存储**: 基于文件系统的数据存储
- 🛠️ **状态管理**: 实时跟踪视频处理状态
- 🔗 **RESTful API**: 标准的 REST 接口设计
- 📝 **详细日志**: 完整的请求和处理日志

## 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 构建项目
```bash
pnpm build
```

### 3. 启动开发服务器
```bash
pnpm dev
```

服务器将在 `http://localhost:3001` 启动。

## API 文档

### 基础信息

- **基础 URL**: `http://localhost:3001`
- **数据格式**: JSON
- **响应格式**: 统一的 API 响应结构

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}
```

### 端点列表

#### 健康检查
```http
GET /health
```

响应示例：
```json
{
  "status": "ok",
  "timestamp": "2025-07-02T08:51:35.791Z",
  "uptime": 6.341960646,
  "memory": {...}
}
```

#### API 文档
```http
GET /api
```

#### 开始爬取视频
```http
POST /api/crawler/start
Content-Type: application/json

{
  "url": "https://v.douyin.com/xxxxx",
  "options": {
    "downloadCover": true,
    "outputDir": "custom_dir"
  }
}
```

响应：
```json
{
  "success": true,
  "data": {
    "videoId": "20250702_kxzr7i8e",
    "message": "爬取任务已启动"
  },
  "timestamp": "2025-07-02T08:51:54.104Z"
}
```

#### 获取视频列表
```http
GET /api/crawler/list
```

响应：
```json
{
  "success": true,
  "data": {
    "videos": [...],
    "total": 1
  },
  "timestamp": "2025-07-02T08:52:07.416Z"
}
```

#### 开始处理视频
```http
POST /api/process/:videoId
Content-Type: application/json

{
  "options": {
    "targetLanguage": "en",
    "voiceType": "female",
    "subtitleStyle": "bilingual"
  }
}
```

#### 查询视频状态
```http
GET /api/status/:videoId
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "20250702_kxzr7i8e",
    "stage": "idle",
    "progress": 100,
    "message": "视频爬取完成",
    "tasks": [...]
  },
  "timestamp": "2025-07-02T08:52:00.589Z"
}
```

#### 上传到 YouTube
```http
POST /api/upload/:videoId
Content-Type: application/json

{
  "metadata": {
    "title": "视频标题",
    "description": "视频描述",
    "tags": ["tag1", "tag2"],
    "privacy": "private"
  }
}
```

#### 获取视频详情
```http
GET /api/video/:videoId
```

## 数据结构

### 视频状态阶段
- `idle`: 空闲状态
- `downloading`: 正在下载
- `transcribing`: 正在转写
- `translating`: 正在翻译
- `synthesizing`: 正在合成语音
- `editing`: 正在编辑视频
- `uploading`: 正在上传
- `completed`: 已完成
- `error`: 发生错误

### 任务类型
- `crawl`: 爬取任务
- `process`: 处理任务
- `upload`: 上传任务

## 目录结构

```
src/
├── controllers/     # 控制器层
├── middleware/      # 中间件
├── routes/         # 路由定义
├── services/       # 服务层
├── types/          # 类型定义
├── utils/          # 工具函数
├── app.ts          # Koa 应用配置
└── index.ts        # 入口文件
```

## 环境变量

```bash
# 服务器端口
PORT=3001

# CORS 允许的源
CORS_ORIGIN=http://localhost:3000

# 开发模式
NODE_ENV=development

# 抖音 API 地址
DOUYIN_API_URL=http://localhost:8000
```

## 开发指南

### 添加新的任务处理器

1. 在 `services/` 目录下创建服务文件
2. 实现 `TaskProcessor` 接口
3. 在服务构造函数中注册处理器

```typescript
export class MyService {
  constructor() {
    queueService.registerProcessor('myTask', this.processMyTask.bind(this))
  }

  private async processMyTask(task: VideoProcessingTask): Promise<void> {
    // 处理逻辑
  }
}
```

### 添加新的 API 端点

1. 在 `controllers/apiController.ts` 中添加方法
2. 在 `routes/index.ts` 中注册路由
3. 更新类型定义

## 错误处理

服务器使用统一的错误处理中间件，会自动：
- 记录详细的错误日志
- 返回标准化的错误响应
- 在开发环境中返回堆栈信息

## 日志系统

使用自定义的日志工具，支持：
- 不同级别的日志 (info, error, warn, debug)
- 时间戳记录
- 开发环境调试信息

## 注意事项

1. **临时实现**: 当前使用模拟的爬取功能，等待 crawler 包完成后需要启用真实功能
2. **内存队列**: 当前使用内存队列，重启会丢失任务状态，生产环境建议使用 Redis
3. **文件存储**: 当前使用文件系统存储，可以考虑升级到数据库存储
4. **错误恢复**: 需要添加任务失败重试机制

## 下一步计划

- [ ] 集成真实的 crawler 包功能
- [ ] 实现视频处理任务处理器
- [ ] 实现 YouTube 上传功能
- [ ] 添加 Redis 队列支持
- [ ] 添加数据库存储支持
- [ ] 实现 WebSocket 实时状态推送 
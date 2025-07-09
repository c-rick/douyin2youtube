# 服务模块说明

## QueueService (队列服务)

合并了原来的 TaskService 功能，提供完整的任务管理和队列处理能力。

### 主要功能

#### 1. 队列处理
- `registerProcessor(type, processor)` - 注册任务处理器
- `addTask(task)` - 添加任务到队列
- `processNext()` - 处理下一个待处理任务
- `stopProcessing()` - 停止队列处理

#### 2. 任务管理
- `getTask(taskId, type)` - 获取特定任务
- `getVideoTasks(videoId)` - 获取视频的所有任务
- `getAllTasks(type)` - 获取所有任务
- `getActiveTasks(type)` - 获取活跃任务
- `removeTask(taskId)` - 删除任务

#### 3. 任务状态管理
- `updateTask(taskId, type, updates)` - 更新任务状态
- `startTask(taskId, type, message)` - 设置任务为运行状态
- `completeTask(taskId, type, videoId, message)` - 设置任务为完成状态
- `failTask(taskId, type, error, message)` - 设置任务为失败状态

#### 4. 清理功能
- `cleanup(maxAge)` - 清理过期任务

### 任务类型

```typescript
enum TaskType {
  Crawling = 'crawling',     // 爬取任务
  Processing = 'processing', // 处理任务
  Uploading = 'uploading'    // 上传任务
}
```

### 使用示例

```typescript
import { queueService, TaskType } from './queueService'

// 注册处理器
queueService.registerProcessor(TaskType.Crawling, async (taskId) => {
  // 处理爬取任务
})

// 添加任务
await queueService.addTask({
  id: 'task_123',
  type: TaskType.Crawling,
  status: 'pending',
  progress: 0,
  // ...其他字段
})

// 更新任务状态
await queueService.updateTask('task_123', TaskType.Crawling, {
  status: 'running',
  progress: 50
})
```

## 其他服务

### CrawlerService
负责视频爬取相关功能。

### VideoProcessingService  
负责视频处理（转写、翻译等）功能。

### StorageService
负责文件存储和元数据管理。

### DatabaseService
负责数据持久化，使用 lowdb 作为轻量级数据库。 
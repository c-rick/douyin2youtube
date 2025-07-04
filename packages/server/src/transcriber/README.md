# Transcriber 模块

该模块用于将视频/音频文件转写成文字，使用 OpenAI 的 Whisper API。

## 功能特性

- 支持多种音频/视频格式（mp4, mov, avi, mkv, mp3, wav等）
- 自动视频转音频处理
- 支持多语言转写
- 生成标准 SRT 字幕格式
- 进度跟踪和错误处理
- 文件大小验证（25MB限制）

## 使用方法

```typescript
import { Transcriber } from './transcriber'

// 创建实例
const transcriber = new Transcriber(
  process.env.OPENAI_API_KEY, 
  (progress) => {
    console.log(`转写进度: ${progress.status} - ${progress.progress}%`)
  }
)

// 转写视频
const result = await transcriber.transcribe({
  audioPath: '/path/to/video.mp4',
  language: 'zh',  // 中文
  responseFormat: 'verbose_json'
})

// 保存为 SRT 字幕
await transcriber.saveAsSRT(result, '/path/to/output.srt')
```

## 集成到视频处理流程

该模块已集成到 `VideoProcessingService` 中，当调用 `/api/process/:id` 接口时会自动执行转写流程：

1. 验证视频文件存在性
2. 检查文件大小限制
3. 提取音频（如果是视频文件）
4. 调用 Whisper API 进行转写
5. 保存结果为 JSON 和 SRT 格式

## 环境变量

需要设置以下环境变量：

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_API_BASE_URL=https://api.openai.com/v1  # 可选，默认值
```

## 输出文件

对于每个视频 ID，会在对应目录下生成：

- `transcript.json` - 完整的转写结果（包含时间戳、置信度等）
- `transcript.srt` - 标准 SRT 字幕文件

## 注意事项

1. 需要有效的 OpenAI API Key
2. 文件大小限制为 25MB
3. 支持的语言代码：zh（中文）、en（英文）等
4. 网络连接需要能够访问 OpenAI API 
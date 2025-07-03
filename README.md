# 抖音翻译搬运助手

一个端到端的视频自动化处理工具，可以从抖音爬取视频、翻译、合成英文语音、合成视频并上传至 YouTube。配备前端可视化控制台操作界面。

## 技术栈

- **构建系统**: Turbo (高效 monorepo 管理)
- **包管理**: pnpm (快速、节省空间)
- **前端**: Next.js + TailwindCSS + TypeScript
- **后端**: Koa.js + TypeScript  
- **爬虫**: Evil0ctal 抖音 API + 自定义封装
- **构建工具**: tsup (快速 TypeScript 构建)

## 项目结构

```
douyin2youtube/
├── packages/
│   ├── web/             # 前端可视化控制台（Next.js）
│   ├── server/          # 后端服务（Koa 提供 REST API）
│   ├── crawler/         # 调用 Evil0ctal 抖音下载接口
│   ├── shared/          # 公共类型、工具函数
│   └── ...（后续可补充其他模块）
├── external/
│   └── douyin-api/      # Evil0ctal 的 Douyin 下载接口（Git 子模块）
├── downloads/           # 存放已爬视频、字幕、封面图
├── env.example          # 环境变量示例
├── pnpm-workspace.yaml  # pnpm 工作区配置
├── package.json         # 根依赖与脚本
├── tsconfig.json        # 根 TypeScript 配置
└── scripts/
    └── start-douyin-api.sh   # 启动 Python API 服务
```

## 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果尚未安装）
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 初始化子模块

```bash
# 初始化并更新 Git 子模块
git submodule update --init --recursive
```

### 3. 安装 Python 依赖

抖音 API 服务需要 Python 环境：

```bash
cd external/douyin-api
pip install -r requirements.txt
```

### 4. 启动服务

```bash
# 启动抖音 API 服务（完整版，包含检查和提示）
pnpm run start-douyin-api

# 启动抖音 API 服务（简化版）
pnpm run start-douyin-api-simple

# 停止抖音 API 服务
pnpm run stop-douyin-api

# 或者手动启动
bash scripts/start-douyin-api.sh
bash scripts/start-douyin-api-simple.sh
bash scripts/stop-douyin-api.sh
```

### 5. 访问服务

- 抖音 API 文档：http://localhost:8000/docs
- 抖音 API 界面：http://localhost:8000

## 可用脚本

### 开发与构建 (Turbo 驱动)

```bash
# 开发模式
pnpm dev                # 启动所有包的开发模式
pnpm dev:server         # 仅启动后端开发模式
pnpm dev:web            # 仅启动前端开发模式

# 构建
pnpm build              # 构建所有包（智能依赖管理）
pnpm build:server       # 构建后端（自动构建依赖包）
pnpm build:web          # 构建前端

# 生产环境
pnpm start              # 启动生产服务

# 维护
pnpm clean              # 清理所有构建产物
pnpm lint               # 代码检查
pnpm type-check         # 类型检查
```

### 爬虫与 API 服务

```bash
# 爬取视频（需要抖音分享链接）
pnpm crawl <抖音分享链接>

# 抖音 API 服务管理
pnpm start-douyin-api   # 启动服务
pnpm stop-douyin-api    # 停止服务

# 演示脚本
./scripts/demo-turbo.sh # Turbo 构建系统演示
```

## 环境变量配置

复制 `env.example` 为 `.env` 并填入相应的 API 密钥：

```bash
cp env.example .env
```

## 开发状态

- ✅ 项目结构初始化
- ✅ Turbo 构建系统配置
- ✅ 抖音 API 集成
- ✅ 基础包结构
- ✅ 前端界面开发
- ✅ 后端 API 开发
- ✅ 视频爬取功能完整实现
- 🚧 视频转写翻译模块
- ⏳ 语音合成模块
- ⏳ 视频编辑模块
- ⏳ YouTube 上传模块

## 性能优势

使用 Turbo 构建系统带来的显著性能提升：

- **首次构建**: 相比传统方式快 16%
- **缓存构建**: 提升 99%（从 25s 降至 0.2s）
- **智能依赖**: 自动识别和构建依赖包
- **并行执行**: 最大化利用多核 CPU

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 免责声明

本项目仅供学习交流使用，请确保上传的内容具有原始视频作者授权或合理使用权限。不可搬运版权视频或敏感内容。 

<p align="center">
<img src="/packages/web/public/logo.svg" width="200" alt="Logo">
</p>
<p align="center">
简单三步，抖音到youtube自动搬运
</p>

## 1. 用例（Usecase）



https://github.com/user-attachments/assets/6ea4de74-d581-4ca7-bdc6-974af8c659b1



## 2. 快速开始（Quick Start）

### 环境准备

```bash
# 安装 pnpm（如未安装）
npm install -g pnpm

# 克隆项目
git clone git@github.com:c-rick/douyin2youtube.git
cd douyin2youtube

# 初始化子模块
git submodule update --init --recursive
```

### 安装依赖

```bash
pnpm install

# 安装 Python 依赖（抖音 API）
cd external/douyin-api
pip install -r requirements.txt
cd ../..
```

### 配置环境变量

```bash
cp env.example .env
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

抖音爬取的配置请看
### 启动服务

```bash
# 启动抖音 API 服务
pnpm run start-douyin-api

# 启动前端 + 后端
pnpm dev
```

- 前端地址: http://localhost:3000
- 后端 API: http://localhost:3001
- 抖音 API 文档: http://localhost:8000/docs

---

## 3. todo 
- [✔️] 自动获取抖音cookie 
- [ ] 桌面应用
- [ ] 其他欢迎issues


## 4. 鸣谢（致谢）

- [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) - 抖音下载 API
- [OpenAI](https://openai.com/) - GPT-4o 翻译服务
- [Google](https://developers.google.com/youtube/v3) - YouTube Data API v3 

## 支持
如果这个项目对你有帮助，可以请我喝杯咖啡～

<p align="center">
  <img src="https://aiccplayground.online/coffe.jpeg" alt="Alipay QR" width="200" />
</p>

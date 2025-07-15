import express, { Router } from 'express'
import { apiController } from '../controllers/apiController'

const router: Router = express.Router()

// 视频相关接口
router.get('/videos', apiController.getVideos.bind(apiController))

router.get('/videos/:id', apiController.getVideo.bind(apiController))
// 下载视频
router.post('/download', apiController.downloadVideo.bind(apiController))

// 远程视频访问视频静态数据
router.get('/file/:id', apiController.getVideoFile.bind(apiController))

// 重试翻译
router.post('/retry/:id', apiController.retryTranslate.bind(apiController))

// 上传到YouTube
router.post('/videos/:id/upload', apiController.uploadVideo.bind(apiController))

// 删除视频
router.delete('/videos/:id', apiController.deleteVideo.bind(apiController))

// YouTube授权
router.get('/youtube/auth-status', apiController.checkYouTubeAuth.bind(apiController))

export default router 
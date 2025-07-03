import Router from 'koa-router'
import { apiController } from '../controllers/apiController'

const router = new Router({
  prefix: '/api'
})

// 爬取相关路由
router.post('/crawler/start', apiController.startCrawling.bind(apiController))
router.get('/crawler/list', apiController.getVideoList.bind(apiController))
router.get('/crawler/status/:taskId', apiController.getCrawlingTaskStatus.bind(apiController))
router.get('/crawler/tasks', apiController.getAllCrawlingTasks.bind(apiController))
router.delete('/crawler/tasks/:taskId', apiController.deleteCrawlingTask.bind(apiController))

// 视频处理路由
router.post('/process/:id', apiController.startProcessing.bind(apiController))

// 状态查询路由
router.get('/status/:id', apiController.getVideoStatus.bind(apiController))

// 上传路由
router.post('/upload/:id', apiController.uploadToYouTube.bind(apiController))

// 视频详情路由
router.get('/video/:id', apiController.getVideoById.bind(apiController))

// 导出配置好的路由
export const apiRouter = router 
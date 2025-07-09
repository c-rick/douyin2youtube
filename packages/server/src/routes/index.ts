import Router from 'koa-router'
import { apiController } from '../controllers/apiController'
import * as path from 'path'
import * as fs from 'fs'

const router = new Router({
  prefix: '/api'
})

// 爬取相关路由
router.post('/crawler/start', apiController.startCrawling.bind(apiController))
router.get('/crawler/list', apiController.getVideoList.bind(apiController))
router.get('/crawler/status/:taskId', apiController.getCrawlingTaskStatus.bind(apiController))
router.get('/crawler/tasks', apiController.getAllCrawlingTasks.bind(apiController))
router.delete('/crawler/tasks/:taskId', apiController.deleteCrawlingTask.bind(apiController))

// 视频资源
router.get('/files/:id/:fpath', async (ctx) => {
  const { id, fpath } = ctx.params
  const filePath = path.join(process.cwd(), 'data', 'downloads', id, fpath)
  console.log('filePath', filePath)
  ctx.body = fs.createReadStream(filePath)
})
// 更新字幕翻译
router.post('/translation/:videoId/:subtitleId', apiController.updateTranslation.bind(apiController))

// 视频处理路由
router.post('/process/:id', apiController.startProcessing.bind(apiController))

// 重试特定步骤路由
router.post('/retry/:id/:step', apiController.retryStep.bind(apiController))

// 状态查询路由
router.get('/status/:id', apiController.getVideoStatus.bind(apiController))

// 上传路由
router.post('/upload/:id', apiController.uploadToYouTube.bind(apiController))

// 视频详情路由
router.get('/video/:id', apiController.getVideoById.bind(apiController))

// 导出配置好的路由
export const apiRouter = router 
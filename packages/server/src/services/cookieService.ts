import * as fs from 'fs-extra'
import * as path from 'path'
import { logger } from '../utils/logger'

interface DouyinCookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: number
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

interface CookieData {
  cookies: string
  lastUpdated: string
  userAgent: string | null
}

class CookieService {
  private cookieFilePath: string

  constructor() {
    this.cookieFilePath = path.join(process.cwd(), 'data', 'douyin_cookies.json')
    this.ensureDataDirectory()
  }

  private async ensureDataDirectory() {
    const dataDir = path.dirname(this.cookieFilePath)
    await fs.ensureDir(dataDir)
  }

  // 保存cookie
  async saveCookies(cookies: string, userAgent: string | null): Promise<void> {
    try {
      const cookieData: CookieData = {
        cookies,
        lastUpdated: new Date().toISOString(),
        userAgent
      }

      await fs.writeJson(this.cookieFilePath, cookieData, { spaces: 2 })
      logger.info(`已保存 ${cookies.length} 个抖音cookies`)
    } catch (error) {
      logger.error('保存cookies失败:', error)
      throw new Error('保存cookies失败')
    }
  }

  // 获取cookie
  async getCookies(): Promise<CookieData | null> {
    try {
      if (!(await fs.pathExists(this.cookieFilePath))) {
        return null
      }

      const cookieData = await fs.readJson(this.cookieFilePath)
      return cookieData
    } catch (error) {
      logger.error('读取cookies失败:', error)
      return null
    }
  }

  // 清除cookie
  async clearCookies(): Promise<void> {
    try {
      if (await fs.pathExists(this.cookieFilePath)) {
        await fs.remove(this.cookieFilePath)
        logger.info('已清除抖音cookies')
      }
    } catch (error) {
      logger.error('清除cookies失败:', error)
      throw new Error('清除cookies失败')
    }
  }

  // 检查cookie是否有效
  async validateCookies(): Promise<boolean> {
    try {
      const cookieData = await this.getCookies()
      if (!cookieData || !cookieData.cookies.length) {
        return false
      }

      // 检查是否有必要的cookie
      const requiredCookies = ['sessionid', 'passport_csrf_token']
      const cookieNames = cookieData.cookies
      const hasRequiredCookies = requiredCookies.some(name => cookieNames.match(name))

      return hasRequiredCookies
    } catch (error) {
      logger.error('验证cookies失败:', error)
      return false
    }
  }

  // 从浏览器导出的JSON格式解析cookie
  parseBrowserCookies(browserCookies: any[]): DouyinCookie[] {
    return browserCookies
      .filter(cookie =>
        cookie.domain &&
        (cookie.domain.includes('douyin.com') || cookie.domain.includes('.douyin.com'))
      )
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expirationDate,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite
      }))
  }

}

export const cookieService = new CookieService()
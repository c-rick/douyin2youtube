import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { logger } from '../utils/logger'
import { cookieService } from './cookieService'
import os from 'os'
// 不直接导入chrome-launcher，改用动态导入

interface BrowserSession {
  browser: Browser
  page: Page
  context: BrowserContext // 使用正确的类型
  isActive: boolean
  startTime: number
  hasShowLoginPrompt: boolean
}

class BrowserCookieService {
  private session: BrowserSession | null = null
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30分钟超时

  // 启动浏览器会话
  async startBrowserSession(): Promise<{ success: boolean; message: string; sessionId?: string }> {
    try {
      // 如果已有活跃会话，先关闭
      if (this.session?.isActive) {
        await this.closeBrowserSession()
      }

      logger.info('启动浏览器会话...')

      // 使用chrome-launcher查找Chrome浏览器路径
      logger.info('查找系统Chrome浏览器路径...')
      const chromePath = await this.findChromePath()

      if (!chromePath) {
        throw new Error('找不到系统Chrome浏览器，请确保已安装Chrome')
      }

      logger.info(`找到Chrome浏览器路径: ${chromePath}`)

      // 使用找到的Chrome路径启动浏览器
      logger.info(`尝试使用Chrome路径启动浏览器: ${chromePath}`);

      // 直接启动Chrome浏览器
      logger.info(`直接启动Chrome浏览器...`);

      try {
        // 使用launch方法启动浏览器
        logger.info('启动浏览器，参数:', JSON.stringify({
          headless: false,
          executablePath: chromePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--enable-automation'
          ]
        }, null, 2));

        // 启动浏览器
        const browser = await chromium.launch({
          headless: false,
          executablePath: chromePath, // 使用找到的Chrome路径
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--enable-automation'
          ],
          devtools: true
        });

        // 创建上下文
        const context = await browser.newContext({
          viewport: null, // 全屏模式
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // 创建页面
        const page = await context.newPage();

        // 导航到抖音登录页面
        const res = await page.goto('https://www.douyin.com', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });


        const sessionId = Date.now().toString();
        // 在使用launchPersistentContext时，不需要单独的browser对象
        // context已经包含了browser的功能
        this.session = {
          browser: context.browser() as Browser,
          page,
          context,
          isActive: true,
          startTime: Date.now(),
          hasShowLoginPrompt: false,
        };

        // 设置会话超时
        setTimeout(() => {
          if (this.session?.isActive) {
            this.closeBrowserSession();
          }
        }, this.SESSION_TIMEOUT);

        logger.info('浏览器会话启动成功');
        return {
          success: true,
          message: '浏览器已打开，请在浏览器中登录抖音账号',
          sessionId
        };
      } catch (error: any) {
        logger.error(`启动失败: ${error.message}`);
        return {
          success: false,
          message: `无法启动Chrome浏览器: ${error.message}`
        };
      }
    } catch (outerError) {
      logger.error('启动浏览器会话失败:', outerError)
      return {
        success: false,
        message: outerError instanceof Error ? outerError.message : '启动浏览器失败'
      }
    }
  }

  // 检查登录状态并获取cookie
  async checkLoginAndGetCookies(): Promise<{ success: boolean; message: string; cookies?: string }> {
    if (!this.session?.isActive) {
      return {
        success: false,
        message: '没有活跃的浏览器会话，请先启动浏览器'
      }
    }

    try {
      const { page } = this.session

      await page.waitForTimeout(5000); // 等待页面加载

      // 检查是否已登录（通过document.cookie）
      const isLoggedIn = await page.evaluate(() => {
        const hasloginInfo = window.localStorage.user_info
        return !!hasloginInfo
      })
      logger.info(`登陆状态： ${isLoggedIn}`)
      if (!isLoggedIn) {
        logger.warn('未检测到有效的登录cookie，可能用户尚未登录')

        // 显示登录提示
        if (!this.session.hasShowLoginPrompt) {
          await this.showLoginPrompt(page)
          this.session.hasShowLoginPrompt = true
        }
        return {
          success: false,
          message: '请先在浏览器中登录抖音账号'
        }
      }

      // 点击一个详情页面，获取XHR请求中的cookies
      try {
        logger.info('尝试点击详情页面获取XHR请求中的cookies...')

        // 监听网络请求
        const requestCookies: string[] = [];
        await page.route('**/*', async (route, request) => {
          const headers = request.headers();
          if (headers['cookie'] && request.url().match('get_v2')) {
            requestCookies.push(headers['cookie']);
            logger.info(`捕获到请求Cookie: ${headers['cookie'].substring(0, 50)}...`);
          }
          await route.continue();
        });

        // 尝试点击一个视频详情链接
        try {
          // 等待视频卡片元素加载
          await page.waitForSelector('[class*=videoCardContainer]', { timeout: 5000 });

          // 点击第一个视频卡片
          await page.click('[class*=videoCardContainer]');
          logger.info('成功点击视频详情页');

          // 等待页面加载
          await page.waitForTimeout(3000);
        } catch (clickError: any) {
          logger.warn(`点击视频详情失败: ${clickError.message}, 尝试直接导航到视频页面`);

          // 如果点击失败，直接导航到一个视频详情页
          await page.goto('https://www.douyin.com/discover', { waitUntil: 'networkidle' });
          await page.waitForTimeout(3000);
          return {
            success: false,
            message: '尝试点击一个视频详情错误'
          }
        }

        // 停止监听网络请求
        await page.unroute('**/*');

        // 如果捕获到了请求Cookie，使用它们
        if (requestCookies.length > 0 && isLoggedIn) {
          logger.info(`成功捕获 ${requestCookies.length} 个请求Cookie`);
          const combinedCookies = requestCookies.join('; ');

          logger.info(`检测到登录状态，获取到XHR请求Cookie: ${combinedCookies.substring(0, 50)}...`);
          return {
            success: true,
            message: `成功获取XHR请求Cookie`,
            cookies: combinedCookies
          };
        }
        return {
          success: false,
          message: '捕获请求Cookie错误'
        }
      } catch (xhrError: any) {
        logger.warn(`获取XHR请求Cookie失败: ${xhrError.message}, 将使用document.cookie`);
        return {
          success: false,
          message: '获取XHR请求Cookie失败'
        }
      }

    } catch (error) {
      logger.error('检查登录状态失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '检查登录状态失败'
      }
    }
  }


  // 在浏览器中执行JavaScript代码
  async executeScript(script: string): Promise<{ success: boolean; message: string; result?: any }> {
    if (!this.session?.isActive) {
      return {
        success: false,
        message: '没有活跃的浏览器会话'
      }
    }

    try {
      const result = await this.session.page.evaluate(script)
      return {
        success: true,
        message: '脚本执行成功',
        result
      }
    } catch (error) {
      logger.error('执行脚本失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '脚本执行失败'
      }
    }
  }

  // 导航到指定URL
  async navigateToUrl(url: string): Promise<{ success: boolean; message: string }> {
    if (!this.session?.isActive) {
      return {
        success: false,
        message: '没有活跃的浏览器会话'
      }
    }

    try {
      await this.session.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      return {
        success: true,
        message: `成功导航到 ${url}`
      }
    } catch (error) {
      logger.error('页面导航失败:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : '页面导航失败'
      }
    }
  }

  // 获取当前页面的用户代理
  async getUserAgent(): Promise<string | null> {
    if (!this.session?.isActive) {
      return null
    }

    try {
      // 使用Function字符串形式来避免TypeScript错误
      const userAgent = await this.session.page.evaluate(function () {
        return navigator.userAgent;
      });
      return userAgent
    } catch (error) {
      logger.error('获取用户代理失败:', error)
      return null
    }
  }

  // 关闭浏览器会话
  async closeBrowserSession(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.session) {
        // 在Playwright中，需要先关闭context，再关闭browser
        if (this.session.context) {
          await this.session.context.close()
        }
        if (this.session.browser) {
          await this.session.browser.close()
        }
        logger.info('浏览器会话已关闭')
      }

      this.session = null

      return {
        success: true,
        message: '浏览器会话已关闭'
      }
    } catch (error) {
      logger.error('关闭浏览器会话失败:', error)
      this.session = null // 强制清理
      return {
        success: false,
        message: error instanceof Error ? error.message : '关闭浏览器失败'
      }
    }
  }

  // 等待用户登录完成（轮询检查）
  async waitForLogin(maxWaitTime: number = 300000): Promise<{ success: boolean; message: string; cookies?: string }> {
    if (!this.session?.isActive) {
      return {
        success: false,
        message: '没有活跃的浏览器会话'
      }
    }

    const startTime = Date.now()
    const checkInterval = 5000 // 每5秒检查一次

    return new Promise((resolve) => {
      const checkLogin = async () => {
        try {
          const result = await this.checkLoginAndGetCookies()

          if (result.success) {
            resolve(result)
            return
          }

          // 检查是否超时
          if (Date.now() - startTime > maxWaitTime) {
            resolve({
              success: false,
              message: '等待登录超时，请手动检查登录状态'
            })
            return
          }

          // 继续等待
          setTimeout(checkLogin, checkInterval)
        } catch (error) {
          resolve({
            success: false,
            message: error instanceof Error ? error.message : '检查登录状态失败'
          })
        }
      }

      checkLogin()
    })
  }

  // 显示登录提示
  private async showLoginPrompt(page: Page): Promise<void> {
    try {
      await page.evaluate(() => {
        if (document.getElementById('loginPrompt')) {
          console.warn('登录提示框已存在，跳过创建')
          return
        }
        // 创建一个登录提示框
        const div = document.createElement('div');
        div.id = 'loginPrompt';
        div.style.position = 'fixed';
        div.style.top = '50%';
        div.style.left = '50%';
        div.style.transform = 'translate(-50%, -50%)';
        div.style.padding = '20px';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        div.style.color = 'white';
        div.style.borderRadius = '10px';
        div.style.zIndex = '10000';
        div.style.maxWidth = '400px';
        div.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.7)';
        div.style.textAlign = 'center';
        div.innerHTML = `
          <h2 style="margin-top: 0; color: #FF0050; font-size: 24px;">请登录抖音账号</h2>
          <p style="font-size: 16px; margin: 15px 0;">系统检测到您尚未登录抖音账号</p>
          <p style="font-size: 16px; margin: 15px 0;">请先完成登录，以便获取必要的Cookie</p>
          <p style="color: #FFC107; font-size: 14px; margin: 10px 0;">系统将获取页面的document.cookie</p>
          <p style="color: #FFC107; font-size: 14px; margin-top: 10px;">登录完成后，系统将自动获取Cookie并继续</p>
          <button id="closeLoginPrompt" style="margin-top: 20px; padding: 10px 20px; background: #FF0050; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">我知道了</button>
        `;
        document.body.appendChild(div);

        // 添加关闭按钮功能
        setTimeout(() => {
          document.getElementById('closeLoginPrompt')?.addEventListener('click', () => {
            console.log('用户点击了登录提示框的关闭按钮');
            div.style.transform = 'translate(-50%, -900%)'; // 向上移动隐藏

          });
        }, 1000)
      });
    } catch (error) {
      logger.error('显示登录提示失败:', error);
    }
  }

  // 查找系统中已安装的Chrome浏览器路径
  private async findChromePath(): Promise<string | null> {
    try {
      // 动态导入chrome-launcher (ESM模块)
      const chromeLauncher = await import('chrome-launcher');

      // 使用chrome-launcher查找Chrome浏览器路径
      const installations = await chromeLauncher.Launcher.getInstallations();

      if (installations && installations.length > 0) {
        // 返回第一个找到的Chrome路径
        return installations[0]
      }

      // 如果chrome-launcher找不到，尝试常见的安装路径
      const commonPaths = [
        // macOS
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        // Linux
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        // Windows
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ]

      // 检查这些路径是否存在
      const fs = require('fs')
      for (const path of commonPaths) {
        try {
          if (fs.existsSync(path)) {
            return path
          }
        } catch (e) {
          // 忽略错误，继续检查下一个路径
        }
      }

      logger.warn('无法找到Chrome浏览器路径')
      return null
    } catch (error) {
      logger.error('查找Chrome路径失败:', error)
      return null
    }
  }
}

export const browserCookieService = new BrowserCookieService()
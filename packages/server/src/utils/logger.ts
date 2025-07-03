interface Logger {
  info: (message: string, ...args: any[]) => void
  error: (message: string, ...args: any[]) => void
  warn: (message: string, ...args: any[]) => void
  debug: (message: string, ...args: any[]) => void
}

function createLogger(): Logger {
  const timestamp = () => new Date().toISOString()

  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[${timestamp()}] [INFO] ${message}`, ...args)
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${timestamp()}] [ERROR] ${message}`, ...args)
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${timestamp()}] [WARN] ${message}`, ...args)
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[${timestamp()}] [DEBUG] ${message}`, ...args)
      }
    }
  }
}

export const logger = createLogger() 
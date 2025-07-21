import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  // 更新为Express相关的依赖和ESM模块
  noExternal: ['express', 'cors', 'chrome-launcher'],
  tsconfig: './tsconfig.build.json',
  // 开发环境配置
  env: {
    NODE_ENV: process.env.NODE_ENV || 'development'
  }
}) 
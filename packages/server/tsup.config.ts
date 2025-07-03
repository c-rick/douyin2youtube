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
  noExternal: ['koa', 'koa-router', 'koa-bodyparser', '@koa/cors'],
  tsconfig: './tsconfig.build.json'
}) 
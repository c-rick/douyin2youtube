import * as path from 'path'
import * as fs from 'fs-extra'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger'
import { SynthesisEngine, SynthesisOptions, SynthesisProgress, SynthesisResult, SynthesisSegment } from './types'
import { ElevenLabsEngine } from './providers/elevenlabs'
import { EdgeTTSEngine } from './providers/edge-tts'

/**
 * 语音合成服务
 */
export class SynthesizerService {
  private engines: Map<string, SynthesisEngine> = new Map()
  private progressCallback?: (progress: SynthesisProgress) => void;
  constructor(progressCallback?: (progress: SynthesisProgress) => void) {
    // 初始化语音合成引擎
    this.engines.set('elevenlabs', new ElevenLabsEngine())
    this.engines.set('edge-tts', new EdgeTTSEngine())
    this.progressCallback = progressCallback
  }

  /**
   * 将文本分段为合成段落
   */
  segmentText(
    subtitles: Array<{ start: number; end: number; text: string; translatedText?: string }>,
    options: { maxSegmentLength?: number } = {}
  ): SynthesisSegment[] {
    const maxLength = options.maxSegmentLength || 300
    const segments: SynthesisSegment[] = []

    for (const subtitle of subtitles) {
      // 使用翻译文本或原始文本
      const text = subtitle.translatedText || subtitle.text

      if (!text || text.trim() === '') continue

      // 如果文本长度超过最大长度，则进行分段
      if (text.length > maxLength) {
        // 简单按句子分割
        const sentences = text.split(/(?<=[.!?])\s+/)
        let currentSegment = ''
        let segmentStart = subtitle.start

        for (const sentence of sentences) {
          if ((currentSegment + sentence).length <= maxLength) {
            currentSegment += (currentSegment ? ' ' : '') + sentence
          } else {
            if (currentSegment) {
              // 计算这部分文本的时长比例
              const segmentDuration = (subtitle.end - subtitle.start) *
                (currentSegment.length / text.length)

              const segmentEnd = segmentStart + segmentDuration

              segments.push({
                id: uuidv4(),
                start: segmentStart,
                end: segmentEnd,
                text: currentSegment
              })

              segmentStart = segmentEnd
              currentSegment = sentence
            } else {
              // 如果单个句子就超过最大长度，则强制分段
              segments.push({
                id: uuidv4(),
                start: subtitle.start,
                end: subtitle.end,
                text: sentence
              })
            }
          }
        }

        // 添加最后一个分段
        if (currentSegment) {
          segments.push({
            id: uuidv4(),
            start: segmentStart,
            end: subtitle.end,
            text: currentSegment
          })
        }
      } else {
        // 不需要分段
        segments.push({
          id: uuidv4(),
          start: subtitle.start,
          end: subtitle.end,
          text
        })
      }
    }

    return segments
  }

  private updateProgress(stage: SynthesisProgress['stage'], progress: number, message: string, error?: string, endTime?: string) {
    if (this.progressCallback) {
      this.progressCallback({
        stage,
        status: error ? 'failed' : 'processing',
        progress,
        message,
        error,
        endTime
      });
    }
  }

  /**
   * 合成语音
   */
  async synthesize(
    videoId: string,
    subtitles: Array<{ start: number; end: number; text: string; translatedText?: string }>,
    options: SynthesisOptions = {},
  ): Promise<SynthesisResult> {
    try {

      // 设置输出目录
      const outputDir = options.outputDir || path.join(process.cwd(), 'data', 'downloads', videoId, 'audio')
      await fs.ensureDir(outputDir)

      // 更新选项
      const synthesisOptions: SynthesisOptions = {
        ...options,
        outputDir,
        combineAudio: options.combineAudio !== false
      }

      // 选择合成引擎
      const engineName = options.provider || 'elevenlabs'
      const engine = this.engines.get(engineName) || this.engines.get('elevenlabs')

      if (!engine) {
        throw new Error(`No synthesis engine available for provider: ${engineName}`)
      }

      this.updateProgress('synthesizing', 65, `准备合成语音 (使用 ${engineName})`)

      // 将字幕分段
      const segments = this.segmentText(subtitles)

      if (segments.length === 0) {
        throw new Error('No valid text segments to synthesize')
      }

      this.updateProgress('synthesizing', 70, `开始合成 ${segments.length} 个语音片段`)

      // 合成所有段落
      const result = await engine.synthesizeMultiple(
        segments,
        synthesisOptions,
        (progress, segmentId) => {
          const message = segmentId
            ? `正在合成第 ${segments.findIndex(s => s.id === segmentId) + 1}/${segments.length} 个语音片段`
            : '正在合成语音'

          this.updateProgress('synthesizing', 70, message, segmentId)
        }
      )

      // 计算总时长
      let totalDuration = 0
      for (const segment of result.segments) {
        totalDuration += (segment.end - segment.start)
      }
      result.duration = totalDuration

      // 保存结果到文件
      const resultFile = path.join(outputDir, 'synthesis-result.json')
      await fs.writeJson(resultFile, result, { spaces: 2 })

      this.updateProgress('completed', 80, '语音合成完成', '', new Date().toISOString())

      return result
    } catch (error) {
      logger.error('Failed to synthesize speech:', error)

      throw error
    }
  }

  /**
   * 获取可用的声音列表
   */
  async getAvailableVoices(provider: string = 'elevenlabs'): Promise<string[]> {
    const engine = this.engines.get(provider)
    if (!engine) {
      return []
    }

    return await engine.getAvailableVoices()
  }
}

// 导出类型
export * from './types' 
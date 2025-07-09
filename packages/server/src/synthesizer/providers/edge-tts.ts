import * as fs from 'fs-extra'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { SynthesisEngine, SynthesisOptions, SynthesisResult, SynthesisSegment } from '../types'
import { logger } from '../../utils/logger'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * Edge TTS 语音合成引擎
 * 使用 Microsoft Edge 的文本到语音服务
 * 需要先安装 edge-tts: npm install -g edge-tts
 */
export class EdgeTTSEngine implements SynthesisEngine {
  private defaultVoice: string = 'en-US-GuyNeural' // 默认男声
  private femaleVoice: string = 'en-US-JennyNeural' // 默认女声
  private availableVoices: Record<string, string> = {
    'Guy': 'en-US-GuyNeural',
    'Jenny': 'en-US-JennyNeural',
    'Aria': 'en-US-AriaNeural',
    'Christopher': 'en-US-ChristopherNeural',
    'Eric': 'en-US-EricNeural',
    'Michelle': 'en-US-MichelleNeural',
    'Roger': 'en-US-RogerNeural',
    'Steffan': 'en-US-SteffanNeural',
    'Jacob': 'en-GB-RyanNeural',
    'Sonia': 'en-GB-SoniaNeural'
  }

  constructor() {
    // 检查是否安装了 edge-tts
    this.checkEdgeTTSInstallation()
  }

  /**
   * 检查是否安装了 edge-tts
   */
  private async checkEdgeTTSInstallation(): Promise<void> {
    try {
      await execAsync('edge-tts --version')
    } catch (error) {
      logger.warn('edge-tts not found. Please install it using: npm install -g edge-tts')
    }
  }

  /**
   * 获取可用的声音列表
   */
  async getAvailableVoices(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('edge-tts --list-voices')

      // 解析输出获取声音列表
      const voiceLines = stdout.split('\n').filter(line => line.trim() !== '')
      const voices: Record<string, string> = {}

      voiceLines.forEach(line => {
        const match = line.match(/Name: (.+?) \((.+?)\)/)
        if (match) {
          const voiceId = match[2]
          const nameParts = match[1].split(' ')
          const shortName = nameParts[nameParts.length - 1].replace('Neural', '')
          voices[shortName] = voiceId
        }
      })

      // 合并默认声音和发现的声音
      this.availableVoices = { ...this.availableVoices, ...voices }

      return Object.keys(this.availableVoices)
    } catch (error) {
      logger.error('Failed to fetch Edge TTS voices:', error)
      return Object.keys(this.availableVoices)
    }
  }

  /**
   * 合成单段文本为语音
   */
  async synthesize(
    text: string,
    options?: SynthesisOptions,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      onProgress?.(10)

      // 确定使用的声音
      let voiceName = options?.voice || (options?.voiceType === 'female' ? 'Jenny' : 'Guy')
      let voiceId = this.availableVoices[voiceName] ||
        (options?.voiceType === 'female' ? this.femaleVoice : this.defaultVoice)

      // 设置输出目录和文件名
      const outputDir = options?.outputDir || path.join(process.cwd(), 'temp', 'audio')
      await fs.ensureDir(outputDir)

      const outputFormat = options?.outputFormat || 'mp3'
      const outputFile = path.join(outputDir, `${uuidv4()}.${outputFormat}`)

      // 设置语音参数
      const rate = options?.speed ? `+${Math.floor((options.speed - 1) * 100)}%` : '+0%'
      const pitch = options?.pitch ? `+${Math.floor(options.pitch * 50)}Hz` : '+0Hz'

      // 准备命令
      const escapedText = text.replace(/"/g, '\\"')
      const cmd = `edge-tts --voice "${voiceId}" --text "${escapedText}" --rate="${rate}" --pitch="${pitch}" --write-media "${outputFile}"`
      logger.info(`Edge TTS: ${cmd}`)
      onProgress?.(30)

      // 执行命令
      await execAsync(cmd)

      onProgress?.(100)
      logger.debug(`Audio synthesized and saved to: ${outputFile}`)

      return outputFile
    } catch (error) {
      logger.error('Failed to synthesize speech with Edge TTS:', error)
      throw new Error(`Edge TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 合成多段文本为语音
   */
  async synthesizeMultiple(
    segments: SynthesisSegment[],
    options?: SynthesisOptions,
    onProgress?: (progress: number, segmentId?: string) => void
  ): Promise<SynthesisResult> {
    if (!segments.length) {
      throw new Error('No segments provided for synthesis')
    }

    const totalSegments = segments.length
    let completedSegments = 0
    const result: SynthesisResult = {
      segments: [...segments],
      duration: 0,
      totalSegments,
      completedSegments
    }

    // 处理每个段落
    for (const segment of result.segments) {
      try {
        onProgress?.(
          Math.floor((completedSegments / totalSegments) * 100),
          segment.id
        )

        // 合成当前段落
        const audioPath = await this.synthesize(
          segment.text,
          options,
          (progress) => {
            // 计算总体进度
            const segmentProgress = progress / 100
            const overallProgress = Math.floor(
              ((completedSegments + segmentProgress) / totalSegments) * 100
            )
            onProgress?.(overallProgress, segment.id)
          }
        )

        // 更新段落信息
        segment.audioPath = audioPath
        completedSegments++
        result.completedSegments = completedSegments

        onProgress?.(
          Math.floor((completedSegments / totalSegments) * 100),
          segment.id
        )
      } catch (error) {
        logger.error(`Failed to synthesize segment ${segment.id}:`, error)
        throw error
      }
    }

    // 如果需要合并音频
    if (options?.combineAudio && result.segments.length > 0) {
      try {
        const audioPaths = result.segments
          .filter(s => s.audioPath)
          .map(s => s.audioPath as string)

        if (audioPaths.length > 0) {
          const outputDir = options?.outputDir || path.join(process.cwd(), 'temp', 'audio')
          const combinedPath = path.join(outputDir, `combined_${uuidv4()}.${options?.outputFormat || 'mp3'}`)

          result.combinedAudioPath = await this.combineAudioFiles(audioPaths, combinedPath)
        }
      } catch (error) {
        logger.error('Failed to combine audio files:', error)
        // 继续返回单独的音频文件
      }
    }

    return result
  }

  /**
   * 合并多个音频文件
   */
  async combineAudioFiles(audioPaths: string[], outputPath: string): Promise<string> {
    try {
      if (audioPaths.length === 0) {
        throw new Error('No audio files to combine')
      }

      if (audioPaths.length === 1) {
        // 如果只有一个文件，直接复制
        await fs.copy(audioPaths[0], outputPath)
        return outputPath
      }

      // 创建临时文件列表
      const tempListFile = path.join(path.dirname(outputPath), 'filelist.txt')
      const fileContent = audioPaths.map(p => `file '${p}'`).join('\n')
      await fs.writeFile(tempListFile, fileContent)

      // 使用 ffmpeg 合并文件
      const cmd = `ffmpeg -f concat -safe 0 -i "${tempListFile}" -c copy "${outputPath}"`

      await execAsync(cmd)

      // 清理临时文件
      await fs.remove(tempListFile)

      return outputPath
    } catch (error) {
      logger.error('Failed to combine audio files:', error)
      throw new Error(`Failed to combine audio files: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
} 
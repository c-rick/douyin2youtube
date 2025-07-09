import axios from 'axios'
import * as fs from 'fs-extra'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { SynthesisEngine, SynthesisOptions, SynthesisResult, SynthesisSegment } from '../types'
import { logger } from '../../utils/logger'

/**
 * ElevenLabs 语音合成引擎
 */
export class ElevenLabsEngine implements SynthesisEngine {
  private apiKey: string
  private baseUrl: string = 'https://api.elevenlabs.io/v1'
  private defaultVoice: string = 'Adam' // 默认男声
  private femaleVoice: string = 'Rachel' // 默认女声
  private voiceIds: Record<string, string> = {
    'Adam': '29vD33N1CtxCmqQRPOHJ', // 默认男声ID
    'Rachel': '21m00Tcm4TlvDq8ikWAM', // 默认女声ID
    'Antoni': 'ErXwobaYiN019PkySvjV',
    'Bella': 'EXAVITQu4vr4xnSDxMaL',
    'Domi': 'AZnzlk1XvdvUeBnXmlld',
    'Elli': 'MF3mGyEYCl7XYWbV9V6O',
    'Josh': 'TxGEqnHWrfWFTfGW9XjX',
    'Arnold': 'VR6AewLTigWG4xSOukaG',
    'Charlotte': 'XB0fDUnXU5powFXDhCwa',
    'Matilda': 'XrExE9yKIg1WjnnlVkGX'
  }

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || ''
    if (!this.apiKey) {
      logger.warn('ElevenLabs API key not provided. Please set ELEVENLABS_API_KEY environment variable.')
    }
  }

  /**
   * 获取可用的声音列表
   */
  async getAvailableVoices(): Promise<string[]> {
    try {
      if (!this.apiKey) {
        return Object.keys(this.voiceIds)
      }

      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      })

      if (response.data && response.data.voices) {
        // 更新声音ID映射
        response.data.voices.forEach((voice: any) => {
          this.voiceIds[voice.name] = voice.voice_id
        })
        return response.data.voices.map((voice: any) => voice.name)
      }

      return Object.keys(this.voiceIds)
    } catch (error) {
      logger.error('Failed to fetch ElevenLabs voices:', error)
      return Object.keys(this.voiceIds)
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
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key not provided')
    }

    try {
      // 确定使用的声音
      let voiceName = options?.voice || (options?.voiceType === 'female' ? this.femaleVoice : this.defaultVoice)
      let voiceId = this.voiceIds[voiceName] || this.voiceIds[this.defaultVoice]

      // 设置输出目录和文件名
      const outputDir = options?.outputDir || path.join(process.cwd(), 'temp', 'audio')
      await fs.ensureDir(outputDir)

      const outputFile = path.join(
        outputDir,
        `${uuidv4()}.${options?.outputFormat || 'mp3'}`
      )

      // 设置语音参数
      const stability = 0.5
      const similarityBoost = 0.75
      const speed = options?.speed || 1.0

      // 调用 ElevenLabs API
      onProgress?.(10)

      const response = await axios({
        method: 'post',
        url: `${this.baseUrl}/text-to-speech/${voiceId}`,
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        data: {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style: 0.0,
            use_speaker_boost: true,
            speaking_rate: speed
          }
        },
        responseType: 'arraybuffer'
      })

      onProgress?.(70)

      // 保存音频文件
      await fs.writeFile(outputFile, response.data)

      onProgress?.(100)
      logger.debug(`Audio synthesized and saved to: ${outputFile}`)

      return outputFile
    } catch (error) {
      logger.error('Failed to synthesize speech with ElevenLabs:', error)
      throw new Error(`ElevenLabs synthesis failed: ${error instanceof Error ? error.message : String(error)}`)
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
   * 注意：这个方法需要系统安装 ffmpeg
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
      const { exec } = require('child_process')
      const cmd = `ffmpeg -f concat -safe 0 -i "${tempListFile}" -c copy "${outputPath}"`

      await new Promise<void>((resolve, reject) => {
        exec(cmd, (error: Error | null) => {
          if (error) {
            reject(error)
            return
          }
          resolve()
        })
      })

      // 清理临时文件
      await fs.remove(tempListFile)

      return outputPath
    } catch (error) {
      logger.error('Failed to combine audio files:', error)
      throw new Error(`Failed to combine audio files: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
} 
import { ProcessingProgress } from '../../shared/types'

/**
 * 语音合成段落
 */
export interface SynthesisSegment {
  id: string
  start: number
  end: number
  text: string
  audioPath?: string
}

/**
 * 语音合成结果
 */
export interface SynthesisResult {
  segments: SynthesisSegment[]
  combinedAudioPath?: string
  duration: number
  totalSegments: number
  completedSegments: number
}

/**
 * 语音合成进度
 */
export interface SynthesisProgress extends ProcessingProgress {
  stage: 'synthesizing' | 'completed' | 'error'
  segmentProgress?: {
    current: number
    total: number
    currentSegmentId?: string
  }
}

/**
 * 语音合成选项
 */
export interface SynthesisOptions {
  voice?: string
  voiceType?: 'male' | 'female'
  provider?: 'elevenlabs' | 'edge-tts'
  speed?: number
  pitch?: number
  outputFormat?: 'wav' | 'mp3'
  outputDir?: string
  combineAudio?: boolean
}

/**
 * 语音合成引擎接口
 */
export interface SynthesisEngine {
  synthesize(
    text: string,
    options?: SynthesisOptions,
    onProgress?: (progress: number) => void
  ): Promise<string>

  synthesizeMultiple(
    segments: SynthesisSegment[],
    options?: SynthesisOptions,
    onProgress?: (progress: number, segmentId?: string) => void
  ): Promise<SynthesisResult>

  combineAudioFiles(
    audioPaths: string[],
    outputPath: string
  ): Promise<string>

  getAvailableVoices(): Promise<string[]>
} 
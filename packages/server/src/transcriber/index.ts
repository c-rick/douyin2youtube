import fs from 'fs-extra';
import OpenAI from 'openai';
import path from 'path';
import {
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionProgress
} from './types';
import {
  validateAudioFile,
  validateFileSize,
  ensureOutputDir,
  extractAudioFromVideo,
  getAudioDuration
} from './utils/audioUtils';
import { TranscriberError } from './utils/errors';
import { logger } from '../utils/logger';

export class Transcriber {
  private openai?: OpenAI;
  private progressCallback?: (progress: TranscriptionProgress) => void;

  constructor(progressCallback?: (progress: TranscriptionProgress) => void) {
    this.progressCallback = progressCallback;
  }

  private getOpenAIClient(): OpenAI {

    if (!this.openai) {
      if (!process.env.OPENAI_API_KEY) {
        throw new TranscriberError('OPENAI_API_KEY is required but not found in environment variables');
      }

      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
      });
    }
    return this.openai;
  }

  private updateProgress(stage: TranscriptionProgress['stage'], progress: number, message: string, error?: string, endTime?: string) {
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

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    try {
      logger.info(`Transcriber: Transcribing audio file: ${options.audioPath}`);
      this.updateProgress('transcribing', 10, '视频处理中...');
      // 验证文件
      await validateAudioFile(options.audioPath);
      // await validateFileSize(options.audioPath);


      // 如果是视频文件，先提取音频
      const fileExt = path.extname(options.audioPath).toLowerCase();
      let audioPath = options.audioPath;

      if (['.mp4', '.mov', '.avi', '.mkv'].includes(fileExt)) {
        const outputPath = path.join(
          path.dirname(options.audioPath),
          `${path.basename(options.audioPath, fileExt)}.mp3`
        );
        if (fs.existsSync(outputPath)) {
          audioPath = outputPath;
        } else {
          audioPath = await extractAudioFromVideo(options.audioPath, outputPath);
        }
      }
      // 准备文件流
      const audioFile = fs.createReadStream(audioPath);
      this.updateProgress('transcribing', 20, '正在转写音频...');

      // 调用 Whisper API（延迟初始化客户端）
      const openai = this.getOpenAIClient();
      logger.info(`Transcriber: Transcribing audio file: ${audioPath} with options: ${JSON.stringify(options)}`);
      const response = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature,
        response_format: options.responseFormat || 'verbose_json'
      });

      logger.info(`Transcription response: ${JSON.stringify(response)}`)

      this.updateProgress('transcribing', 30, '转写成功正在保存...');

      // 处理响应
      const result: TranscriptionResult = {
        text: response.text,
        segments: (response as any).segments?.map((segment: any) => ({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          text: segment.text,
          tokens: segment.tokens,
          temperature: segment.temperature,
          avgLogprob: segment.avg_logprob,
          compressionRatio: segment.compression_ratio,
          noSpeechProb: segment.no_speech_prob
        })) || [],
        language: (response as any).language || options.language || 'unknown'
      };

      // 保存为 SRT 格式
      await this.saveAsSRT(result, path.join(path.dirname(options.audioPath), `${path.basename(options.audioPath, fileExt)}.srt`))


      this.updateProgress('completed', 40, '转写成功');

      // 更新进度
      // this.updateProgress('completed', 100, '处理完成...', '', new Date().toISOString());
      return result;

    } catch (error: any) {
      const transcribeError = new TranscriberError(
        error.message || 'Transcription failed'
      );
      transcribeError.code = error.code || 'TRANSCRIPTION_ERROR';
      transcribeError.status = error.status;
      transcribeError.details = error;

      this.updateProgress('error', 0, '转写失败...', transcribeError.message);
      throw transcribeError;
    }
  }

  // 将转写结果保存为 SRT 格式
  async saveAsSRT(result: TranscriptionResult, outputPath: string): Promise<void> {
    await ensureOutputDir(outputPath);

    const srtContent = result.segments
      .map((segment, index) => {
        const startTime = this.formatSRTTime(segment.start);
        const endTime = this.formatSRTTime(segment.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      })
      .join('\n');

    await fs.writeFile(outputPath, srtContent, 'utf8');
  }

  // 格式化时间为 SRT 格式
  private formatSRTTime(seconds: number): string {
    const pad = (num: number): string => num.toString().padStart(2, '0');
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${ms.toString().padStart(3, '0')}`;
  }
}
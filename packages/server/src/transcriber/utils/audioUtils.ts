import fs from 'fs-extra';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import { TranscriberError } from './errors';

// 确保音频文件存在
export async function validateAudioFile(audioPath: string): Promise<void> {
  try {
    await fs.access(audioPath);
  } catch (error) {
    throw new TranscriberError('Audio file not found');
  }
}

// 获取音频时长（秒）
export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

// 将视频转换为音频
export async function extractAudioFromVideo(
  videoPath: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('mp3')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// 确保输出目录存在
export async function ensureOutputDir(outputPath: string): Promise<void> {
  await fs.ensureDir(path.dirname(outputPath));
}

// 检查文件大小是否超过限制
export async function validateFileSize(
  filePath: string,
  maxSizeMB: number = 25
): Promise<void> {
  const stats = await fs.stat(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    throw new TranscriberError(`File size exceeds ${maxSizeMB}MB limit`);
  }
} 
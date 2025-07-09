import { TranslationSegment, TranslatedSegment } from '../types';

/**
 * 将转录的segments转换为翻译segments
 */
export function convertTranscriptionToTranslationSegments(segments: any[]): TranslationSegment[] {
  return segments.map(segment => ({
    id: segment.id,
    start: segment.start,
    end: segment.end,
    text: segment.text
  }));
}

/**
 * 分批处理文本，避免单次请求过长
 */
export function batchText(text: string, maxLength: number = 2000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const sentences = text.split(/[.!?。！？]/);
  const batches: string[] = [];
  let currentBatch = '';

  for (const sentence of sentences) {
    if (currentBatch.length + sentence.length <= maxLength) {
      currentBatch += sentence + (sentence.match(/[.!?。！？]/) ? '' : '。');
    } else {
      if (currentBatch) {
        batches.push(currentBatch);
      }
      currentBatch = sentence + (sentence.match(/[.!?。！？]/) ? '' : '。');
    }
  }

  if (currentBatch) {
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * 分批处理segments，避免单次请求过长
 */
export function batchSegments(segments: TranslationSegment[], maxSegments: number = 10): TranslationSegment[][] {
  const batches: TranslationSegment[][] = [];

  for (let i = 0; i < segments.length; i += maxSegments) {
    batches.push(segments.slice(i, i + maxSegments));
  }

  return batches;
}

/**
 * 验证语言代码
 */
export function validateLanguageCode(code: string): boolean {
  const supportedLanguages = [
    'zh', 'zh-CN', 'zh-TW', 'en', 'en-US', 'en-GB',
    'ja', 'ko', 'fr', 'de', 'es', 'it', 'ru', 'pt'
  ];
  return supportedLanguages.includes(code);
}

/**
 * 标准化语言代码
 */
export function normalizeLanguageCode(code: string): string {
  const languageMap: { [key: string]: string } = {
    'zh': 'zh-CN',
    'chinese': 'zh-CN',
    'en': 'en-US',
    'english': 'en-US',
    'ja': 'ja',
    'japanese': 'ja',
    'ko': 'ko',
    'korean': 'ko'
  };

  return languageMap[code.toLowerCase()] || code;
} 
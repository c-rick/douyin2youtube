export interface TranslationOptions {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  segments?: TranslationSegment[];
  provider?: 'openai' | 'deepl';
  temperature?: number;
  prompt?: string;
}

export interface TranslationSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranslationResult {
  text: string;
  segments: TranslatedSegment[];
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
}

export interface TranslatedSegment {
  id: number;
  start: number;
  end: number;
  originalText: string;
  translatedText: string;
}

// 使用共享的进度类型
export type { TranslationProgress } from '../../shared/types'

export interface TranslatorConfig {
  openai?: {
    apiKey: string;
    baseURL?: string;
    model?: string;
  };
  deepl?: {
    apiKey: string;
    baseURL?: string;
  };
} 
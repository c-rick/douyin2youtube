export interface TranscriptionOptions {
  audioPath: string;
  language?: string;
  prompt?: string;
  temperature?: number;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avgLogprob: number;
  compressionRatio: number;
  noSpeechProb: number;
}

export type TranscriptionProgress = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
} 
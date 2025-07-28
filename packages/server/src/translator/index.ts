import OpenAI from 'openai';
import axios from 'axios';
import { logger } from '../utils/logger';
import {
  TranslationOptions,
  TranslationResult,
  TranslationProgress,
  TranslatorConfig,
  TranslationSegment,
  TranslatedSegment
} from './types';
import { TranslatorError } from './utils/errors';
import {
  batchText,
  batchSegments,
  validateLanguageCode,
  normalizeLanguageCode
} from './utils/translationUtils';

export class Translator {
  private openai?: OpenAI;
  private deeplApiKey?: string;
  private progressCallback?: (progress: TranslationProgress) => void;
  private model?: string

  constructor(
    progressCallback?: (progress: TranslationProgress) => void
  ) {
    this.progressCallback = progressCallback;

    // 初始化OpenAI客户端
    if (process.env.QWEN_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.QWEN_API_KEY,
        baseURL: process.env.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      });
      this.model = process.env.QWEN_MODEL
      logger.info('openai init', this.model)
    } else if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
      });
      this.model = process.env.OPENAI_MODEL
      logger.info('openai init', this.model)
    }

    // 初始化DeepL API密钥
    if (process.env.DEEPL_API_KEY) {
      this.deeplApiKey = process.env.DEEPL_API_KEY;
    }
  }

  private updateProgress(stage: TranslationProgress['stage'], progress: number, message: string, error?: string, endTime?: string) {
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
   * 翻译文本或segments
   */
  async translate(options: TranslationOptions): Promise<TranslationResult> {
    try {
      this.updateProgress('translating', 45, '开始翻译...');
      options.targetLanguage = options.targetLanguage || 'en'
      // 验证语言代码
      if (!validateLanguageCode(options.targetLanguage)) {
        throw new TranslatorError(`不支持的目标语言: ${options.targetLanguage}`);
      }

      // 标准化语言代码
      const targetLanguage = normalizeLanguageCode(options.targetLanguage);
      const sourceLanguage = options.sourceLanguage
        ? normalizeLanguageCode(options.sourceLanguage)
        : 'auto';

      let result: TranslationResult;

      if (options.segments && options.segments.length > 0) {
        // 翻译segments
        result = await this.translateSegments(options, sourceLanguage, targetLanguage);
      } else {
        // 翻译纯文本
        result = await this.translateText(options, sourceLanguage, targetLanguage);
      }

      this.updateProgress('completed', 60, '翻译完成', '', new Date().toISOString());
      return result;

    } catch (error: any) {
      const translatorError = new TranslatorError(
        error.message || '翻译失败',
        error.code || 'TRANSLATION_ERROR',
        error.status
      );
      translatorError.details = error;

      this.updateProgress('translating', 40, '翻译失败', translatorError.message, new Date().toISOString());
      throw translatorError;
    }
  }

  /**
   * 翻译文本
   */
  private async translateText(
    options: TranslationOptions,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    this.updateProgress('translating', 50, '正在翻译文本...');

    const provider = options.provider || 'openai';
    let translatedText: string;

    if (provider === 'openai') {
      translatedText = await this.translateWithOpenAI(options.text, sourceLanguage, targetLanguage, options.prompt);
    } else if (provider === 'deepl') {
      translatedText = await this.translateWithDeepL(options.text, sourceLanguage, targetLanguage);
    } else {
      throw new TranslatorError(`不支持的翻译提供商: ${provider}`);
    }

    return {
      text: translatedText,
      segments: [],
      sourceLanguage,
      targetLanguage,
      provider
    };
  }

  /**
   * 翻译segments
   */
  private async translateSegments(
    options: TranslationOptions,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    this.updateProgress('translating', 55, '正在翻译字幕片段...');

    const segments = options.segments!;
    const batches = batchSegments(segments, 5); // 每批处理5个片段
    const translatedSegments: TranslatedSegment[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      this.updateProgress('translating', 55, `正在翻译第 ${i + 1}/${batches.length} 批片段...`);

      const batchText = batch.map(s => s.text).join('\n');
      const provider = options.provider || 'openai';

      let translatedBatchText: string;
      if (provider === 'openai') {
        translatedBatchText = await this.translateWithOpenAI(batchText, sourceLanguage, targetLanguage, options.prompt);
      } else if (provider === 'deepl') {
        translatedBatchText = await this.translateWithDeepL(batchText, sourceLanguage, targetLanguage);
      } else {
        throw new TranslatorError(`不支持的翻译提供商: ${provider}`);
      }

      const translatedLines = translatedBatchText.split('\n');

      // 将翻译结果映射回对应的segment
      for (let j = 0; j < batch.length; j++) {
        const segment = batch[j];
        const translatedText = translatedLines[j] || translatedLines[0] || '';

        translatedSegments.push({
          id: segment.id,
          start: segment.start,
          end: segment.end,
          originalText: segment.text,
          translatedText: translatedText.trim()
        });
      }
    }

    const fullTranslatedText = translatedSegments.map(s => s.translatedText).join(' ');

    return {
      text: fullTranslatedText,
      segments: translatedSegments,
      sourceLanguage,
      targetLanguage,
      provider: options.provider || 'openai'
    };
  }

  /**
   * 使用OpenAI翻译
   */
  private async translateWithOpenAI(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    customPrompt?: string,
    limit: number = 80
  ): Promise<string> {
    if (!this.openai) {
      throw new TranslatorError('OpenAI客户端未初始化，请检查API密钥配置');
    }

    const languageNames: { [key: string]: string } = {
      'zh-CN': '中文',
      'en-US': '英文',
      'ja': '日文',
      'ko': '韩文'
    };

    const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    const prompt = customPrompt ||
      `请将以下${sourceLangName}文本翻译成${targetLangName}，保持原文的语气和风格，确保翻译自然流畅， 请直接输出翻译结果，无需说明或解释,  需要保持翻译的结果为${limit}个字符内，包含标点符号，如果超过${limit}个字符，请进行总结概括：\n\n原文：${text}\n\n翻译：`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的翻译助手。你的任务是接收一段用户提供的原文内容，然后将其准确地翻译为目标语言。首先对原文内容进行总结，然后必须直接返回翻译后的内容，不要多说任何无关内容，不要解释你的翻译过程'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });
    const translatedText = response.choices[0]?.message?.content;
    if (!translatedText) {
      throw new TranslatorError('OpenAI翻译响应为空');
    }

    logger.info('OpenAI翻译完成:', {
      originalLength: text.length,
      translatedLength: translatedText.length
    });

    return translatedText;
  }

  /**
   * 使用DeepL翻译
   */
  private async translateWithDeepL(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string> {
    if (!this.deeplApiKey) {
      throw new TranslatorError('DeepL API密钥未配置');
    }

    // DeepL语言代码映射
    const deeplLanguageMap: { [key: string]: string } = {
      'zh-CN': 'ZH',
      'en-US': 'EN-US',
      'ja': 'JA',
      'ko': 'KO',
      'fr': 'FR',
      'de': 'DE',
      'es': 'ES',
      'it': 'IT',
      'ru': 'RU',
      'pt': 'PT'
    };

    const sourceLang = sourceLanguage === 'auto' ? undefined : deeplLanguageMap[sourceLanguage];
    const targetLang = deeplLanguageMap[targetLanguage];

    if (!targetLang) {
      throw new TranslatorError(`DeepL不支持目标语言: ${targetLanguage}`);
    }

    try {
      const response = await axios.post('https://api-free.deepl.com/v2/translate', {
        text: [text],
        source_lang: sourceLang,
        target_lang: targetLang
      }, {
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.deeplApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const translatedText = response.data.translations[0]?.text;
      if (!translatedText) {
        throw new TranslatorError('DeepL翻译响应为空');
      }

      logger.info('DeepL翻译完成:', {
        originalLength: text.length,
        translatedLength: translatedText.length
      });

      return translatedText;

    } catch (error: any) {
      if (error.response) {
        throw new TranslatorError(
          `DeepL翻译失败: ${error.response.data?.message || error.message}`,
          'DEEPL_API_ERROR',
          error.response.status
        );
      }
      throw new TranslatorError(`DeepL翻译请求失败: ${error.message}`);
    }
  }

  // 简化的翻译方法，适配新的API
  async translateSimple(text: string, from: string = 'zh', to: string = 'en'): Promise<string> {
    const result = await this.translate({
      text,
      sourceLanguage: from === 'zh' ? 'zh-CN' : 'en-US',
      targetLanguage: to === 'en' ? 'en-US' : 'zh-CN',
      provider: 'openai'
    })
    return result.text
  }
}

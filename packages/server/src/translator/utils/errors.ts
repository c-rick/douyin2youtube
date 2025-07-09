export class TranslatorError extends Error {
  code?: string;
  status?: number;
  details?: any;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'TranslatorError';
    this.code = code;
    this.status = status;
  }
} 
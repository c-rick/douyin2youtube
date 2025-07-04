export class TranscriberError extends Error {
  code: string;
  status?: number;
  details?: any;

  constructor(message: string, code: string = 'TRANSCRIBER_ERROR') {
    super(message);
    this.name = 'TranscriberError';
    this.code = code;
  }
} 
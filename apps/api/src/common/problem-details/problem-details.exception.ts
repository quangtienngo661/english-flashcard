import { HttpException } from '@nestjs/common';

export interface ProblemDetailsOptions {
  status: number;
  title: string;
  type?: string;
  detail?: string;
  extensions?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export class ProblemDetailsException extends HttpException {
  readonly problemType: string;
  readonly problemTitle: string;
  readonly problemDetail?: string;
  readonly extensions?: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor(options: ProblemDetailsOptions) {
    super(options.title, options.status);
    this.problemType = options.type ?? 'about:blank';
    this.problemTitle = options.title;
    this.problemDetail = options.detail;
    this.extensions = options.extensions;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

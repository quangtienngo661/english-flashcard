import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { RequestWithOperationId } from '../logging/operation-id.middleware.js';
import { ProblemDetailsException, type ProblemDetailsOptions } from './problem-details.exception.js';

interface ProblemDetailsResponse {
  status(code: number): ProblemDetailsResponse;
  type(contentType: string): ProblemDetailsResponse;
  json(body: unknown): ProblemDetailsResponse;
  setHeader(name: string, value: string): void;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly problemTypeBase?: string) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ProblemDetailsResponse>();
    const request = ctx.getRequest<Partial<RequestWithOperationId>>();

    const { status, type, title, detail, extensions, retryAfterSeconds } = this.toProblemDetails(exception);
    if (retryAfterSeconds !== undefined) {
      response.setHeader('Retry-After', String(retryAfterSeconds));
    }

    response
      .status(status)
      .type('application/problem+json')
      .json({
        ...extensions,
        type: this.problemTypeBase && type && type !== 'about:blank'
          ? `${this.problemTypeBase}${type}` : 'about:blank',
        status,
        title,
        detail,
        instance: request.url,
        operation_id: request.operationId,
      });
  }

  private toProblemDetails(exception: unknown): ProblemDetailsOptions {
    if (exception instanceof ProblemDetailsException) {
      return {
        status: exception.getStatus(),
        type: exception.problemType,
        title: exception.problemTitle,
        detail: exception.problemDetail,
        extensions: exception.extensions,
        retryAfterSeconds: exception.retryAfterSeconds,
      };
    }
    // body-parser raises http-errors (`expose: true`, 4xx `status`) for every client-side body problem:
    // bad JSON, oversized body, unsupported charset or encoding, corrupt gzip. None of them may become 500.
    if (isExposedClientError(exception)) {
      if (exception.status === 413) {
        return { status: 413, type: 'payload-too-large', title: 'Payload too large' };
      }
      if (exception.status === 415) {
        return { status: 415, type: 'unsupported-media-type', title: 'Unsupported media type' };
      }
      return { status: 400, type: 'validation-failed', title: 'Validation failed' };
    }
    if (exception instanceof HttpException) {
      if (exception.getStatus() === HttpStatus.BAD_REQUEST) {
        const body = exception.getResponse();
        const message: unknown = typeof body === 'string' ? body
          : 'message' in body ? body.message : undefined;
        const violations = Array.isArray(message)
          ? message.filter((value): value is string => typeof value === 'string')
          : typeof message === 'string' ? [message] : [];
        return {
          status: 400, type: 'validation-failed', title: 'Validation failed', extensions: { violations },
        };
      }
      return {
        status: exception.getStatus(),
        type: 'about:blank',
        title: exception.message,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      type: 'about:blank',
      title: 'Internal Server Error',
    };
  }
}

function isExposedClientError(exception: unknown): exception is { status: number } {
  if (exception === null || typeof exception !== 'object' || exception instanceof HttpException) {
    return false;
  }
  const { status, expose } = exception as { status?: unknown; expose?: unknown };
  return expose === true && typeof status === 'number' && status >= 400 && status < 500;
}

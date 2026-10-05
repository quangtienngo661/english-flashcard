import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { RequestWithOperationId } from '../logging/operation-id.middleware.js';
import { ProblemDetailsException } from './problem-details.exception.js';

interface ProblemDetailsResponse {
  status(code: number): ProblemDetailsResponse;
  type(contentType: string): ProblemDetailsResponse;
  json(body: unknown): ProblemDetailsResponse;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ProblemDetailsResponse>();
    const request = ctx.getRequest<Partial<RequestWithOperationId>>();

    const { status, type, title, detail } = this.toProblemDetails(exception);

    response
      .status(status)
      .type('application/problem+json')
      .json({
        type,
        status,
        title,
        detail,
        instance: request.url,
        operation_id: request.operationId,
      });
  }

  private toProblemDetails(exception: unknown): {
    status: number;
    type: string;
    title: string;
    detail?: string;
  } {
    if (exception instanceof ProblemDetailsException) {
      return {
        status: exception.getStatus(),
        type: exception.problemType,
        title: exception.problemTitle,
        detail: exception.problemDetail,
      };
    }
    if (exception instanceof HttpException) {
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

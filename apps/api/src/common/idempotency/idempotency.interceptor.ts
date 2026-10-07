import { createHash } from 'node:crypto';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import type { Response } from 'express';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { PRISMA_CLIENT } from '../db/prisma.module.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import type { RequestWithUser } from '../request-user/request-user.js';
import { IDEMPOTENT_KEY, type IdempotentOptions } from './idempotent.decorator.js';
import { runIdempotent } from './idempotency.service.js';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithUser>();
    const response = httpContext.getResponse<Response>();

    const { timeoutSeconds } = this.reflector.get<Required<IdempotentOptions>>(
      IDEMPOTENT_KEY,
      context.getHandler(),
    ) ?? { timeoutSeconds: 30 };

    const idempotencyKey = request.headers['idempotency-key'];
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
      throw new ProblemDetailsException({ status: 400, title: 'Idempotency-Key required' });
    }

    const userId = request.user?.userId;
    if (!userId) {
      throw new ProblemDetailsException({ status: 400, title: 'No RequestUser for idempotent request' });
    }

    const payloadHash = createHash('sha256').update(JSON.stringify(request.body ?? null)).digest('hex');

    return from(
      runIdempotent(
        this.prisma,
        { key: idempotencyKey, userId, endpoint: request.path, payloadHash },
        async () => {
          const body = await firstValueFrom(next.handle());
          return { status: response.statusCode, body };
        },
        { timeoutSeconds },
      ).then((result) => {
        if (result.kind === 'conflict') {
          response.setHeader('Retry-After', String(result.retryAfterSeconds));
          throw new ProblemDetailsException({
            status: 409,
            title: 'Request already in progress',
            detail: `Retry after ${result.retryAfterSeconds} seconds`,
          });
        }
        if (result.kind === 'abandoned') {
          throw new ProblemDetailsException({
            status: 409,
            type: 'idempotency-key-abandoned',
            title: 'Previous attempt was interrupted',
            detail: 'Start over with a new Idempotency-Key',
          });
        }
        if (result.kind === 'reject') {
          throw new ProblemDetailsException({
            status: 400,
            title: 'Idempotency-Key reused with a different payload',
          });
        }
        return result.body;
      }),
    );
  }
}

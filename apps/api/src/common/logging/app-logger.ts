import { Inject, Injectable } from '@nestjs/common';
import { getOperationId } from './request-context.js';

export type LogEntry = {
  level: 'info' | 'warn' | 'error';
  event: string;
  operation_id?: string;
  [k: string]: unknown;
};

export interface LogSink {
  write(entry: LogEntry): void;
}

export const LOG_SINK = 'LOG_SINK';
const REDACT_KEY_PATTERN = /password|otp|code|token|cookie|authorization|answer|contextSentence/i;
const REDACTED = '[redacted]';

function serializeError(err: unknown): { name: string; code?: string | number } {
  if (err !== null && typeof err === 'object') {
    const name = 'name' in err && typeof err.name === 'string' ? err.name : 'UnknownError';
    const code = 'code' in err && (typeof err.code === 'string' || typeof err.code === 'number')
      ? err.code : undefined;
    return code === undefined ? { name } : { name, code };
  }
  return { name: 'UnknownError' };
}

function redact(value: unknown): unknown {
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACT_KEY_PATTERN.test(key) ? REDACTED : redact(val);
    }
    return out;
  }
  return value;
}

@Injectable()
export class AppLogger {
  constructor(@Inject(LOG_SINK) private readonly sink: LogSink) {}

  info(event: string, fields?: object): void {
    this.write('info', event, fields);
  }

  warn(event: string, fields?: object): void {
    this.write('warn', event, fields);
  }

  error(event: string, err: unknown, fields?: object): void {
    this.write('error', event, fields, serializeError(err));
  }

  private write(level: LogEntry['level'], event: string, fields?: object, error?: object): void {
    const entry: LogEntry = { ...redact(fields) as object, level, event };
    delete entry.operation_id;
    const operationId = getOperationId();
    if (operationId !== undefined) entry.operation_id = operationId;
    if (error !== undefined) entry.error = error;
    this.sink.write(entry);
  }
}

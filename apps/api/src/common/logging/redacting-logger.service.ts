const REDACT_KEY_PATTERN = /password|otp|token|answer|contextSentence/i;
const REDACTED = '[redacted]';

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = REDACT_KEY_PATTERN.test(key) ? REDACTED : redact(val);
    }
    return out;
  }
  return value;
}

export class RedactingLoggerService {
  constructor(private readonly sink: (...args: unknown[]) => void = console.log) {}

  log(message: unknown, context?: string): void {
    this.sink(redact(message), context);
  }
}

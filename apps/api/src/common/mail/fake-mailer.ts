import { Mailer, type MailMessage } from './mailer.js';

export class FakeMailer extends Mailer {
  readonly sent: MailMessage[] = [];
  private nextError?: Error;
  private failuresLeft = 0;

  /** The next `times` sends throw `err`. */
  failNext(err = new Error('Simulated mail failure'), times = 1): void {
    this.nextError = err;
    this.failuresLeft = times;
  }

  async send(msg: MailMessage): Promise<void> {
    if (this.nextError !== undefined && this.failuresLeft > 0) {
      const error = this.nextError;
      if (--this.failuresLeft === 0) this.nextError = undefined;
      throw error;
    }
    this.sent.push({ ...msg });
  }

  otpFor(to: string): string | undefined {
    for (const msg of this.sent.toReversed()) {
      if (msg.to !== to) continue;
      const code = /\b\d{6}\b/.exec(msg.text)?.[0];
      if (code !== undefined) return code;
    }
    return undefined;
  }
}

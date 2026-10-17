import { Mailer, type MailMessage } from './mailer.js';

export class FakeMailer extends Mailer {
  readonly sent: MailMessage[] = [];
  private nextError?: Error;

  failNext(err = new Error('Simulated mail failure')): void {
    this.nextError = err;
  }

  async send(msg: MailMessage): Promise<void> {
    if (this.nextError !== undefined) {
      const error = this.nextError;
      this.nextError = undefined;
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

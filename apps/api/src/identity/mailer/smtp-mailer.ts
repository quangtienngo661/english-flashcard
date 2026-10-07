import { Inject, Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { Mailer, type MailMessage } from './mailer.js';

@Injectable()
export class SmtpMailer extends Mailer {
  private readonly transport: ReturnType<typeof nodemailer.createTransport>;
  private readonly from: string;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    const { host, port, secure, user, pass, from } = config.smtp;
    this.from = from;
    this.transport = nodemailer.createTransport({
      host, port, secure,
      ...(user === undefined ? {} : { auth: { user, pass } }),
      // These limit individual SMTP phases, not the total send duration (B1E34).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }

  async send(msg: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...msg });
  }
}

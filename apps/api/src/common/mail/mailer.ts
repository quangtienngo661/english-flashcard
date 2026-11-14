export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  /** Optional HTML part; sent next to `text` as multipart/alternative. `text` is always present. */
  html?: string;
}

export abstract class Mailer {
  abstract send(msg: MailMessage): Promise<void>;
}

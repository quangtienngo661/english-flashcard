import { describe, expect, it } from 'vitest';
import { FakeMailer } from './fake-mailer.js';

describe('FakeMailer', () => {
  it('failNext(err, times) fails exactly the next `times` sends, then sends normally', async () => {
    const mailer = new FakeMailer();
    const message = { to: 'a@example.com', subject: 's', text: 't' };
    const error = new Error('SMTP 421');
    mailer.failNext(error, 3);
    for (let attempt = 0; attempt < 3; attempt++) await expect(mailer.send(message)).rejects.toBe(error);
    expect(mailer.sent).toEqual([]);
    await mailer.send(message);
    expect(mailer.sent).toEqual([message]);
  });
});

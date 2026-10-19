import { createServer } from 'node:net';
import nodemailer from 'nodemailer';
import { describe, expect, it } from 'vitest';
import { classifyMailError } from './mail-error.js';

/** A port nothing listens on: bind to 0, read the port, close. */
async function closedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve); });
  const { port } = server.address() as { port: number };
  await new Promise<void>((resolve) => { server.close(() => { resolve(); }); });
  return port;
}

const smtpError = (fields: Record<string, unknown>) => Object.assign(new Error('smtp'), fields);

describe('classifyMailError (M7, M9, D37)', () => {
  it('a 5xx reply is permanent; a 4xx reply is transient (the server refused the message)', () => {
    expect(classifyMailError(smtpError({ code: 'EENVELOPE', responseCode: 550, command: 'RCPT TO' }))).toBe('permanent');
    expect(classifyMailError(smtpError({ code: 'EAUTH', responseCode: 535, command: 'AUTH PLAIN' }))).toBe('permanent');
    expect(classifyMailError(smtpError({ code: 'EMESSAGE', responseCode: 452, command: 'DATA' }))).toBe('transient');
    expect(classifyMailError(smtpError({ code: 'EENVELOPE', responseCode: 421, command: 'MAIL FROM' }))).toBe('transient');
  });

  it('failures before any SMTP conversation are transient: DNS, connect, connection and greeting timeouts', () => {
    expect(classifyMailError(smtpError({ code: 'EDNS', command: 'CONN' }))).toBe('transient');
    expect(classifyMailError(smtpError({ code: 'ESOCKET', command: 'CONN', syscall: 'connect' }))).toBe('transient');
    expect(classifyMailError(Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT', command: 'CONN' })))
      .toBe('transient');
    expect(classifyMailError(Object.assign(new Error('Greeting never received'), { code: 'ETIMEDOUT', command: 'CONN' })))
      .toBe('transient');
  });

  it('a timeout or reset once connected, or anything unrecognised, is unknown: the server may have the message', () => {
    expect(classifyMailError(Object.assign(new Error('Timeout'), { code: 'ETIMEDOUT', command: 'CONN' }))).toBe('unknown');
    expect(classifyMailError(smtpError({ code: 'ESOCKET', command: 'CONN', syscall: 'read', errno: -4077 }))).toBe('unknown');
    expect(classifyMailError(Object.assign(new Error('Connection closed unexpectedly'), { code: 'ECONNECTION', command: 'CONN' })))
      .toBe('unknown');
    expect(classifyMailError(new Error('boom'))).toBe('unknown');
    expect(classifyMailError('not an error')).toBe('unknown');
  });

  it('control: a real nodemailer send to a closed port is classified transient', async () => {
    const port = await closedPort();
    const transport = nodemailer.createTransport({ host: '127.0.0.1', port, secure: false, connectionTimeout: 2_000 });
    const error = await transport.sendMail({ from: 'a@example.com', to: 'b@example.com', subject: 's', text: 't' })
      .then(() => undefined, (err: unknown) => err);
    expect(error).toMatchObject({ command: 'CONN' });
    expect(classifyMailError(error)).toBe('transient');
  });
});

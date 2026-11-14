export const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

type Summary = { ID: string; To?: Array<{ Address: string }>; Created?: string };

export async function mailsTo(email: string): Promise<Summary[]> {
  const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()) as { messages?: Summary[] };
  return (list.messages ?? []).filter((message) => message.To?.some((to) => to.Address.toLowerCase() === email.toLowerCase()))
    .sort((a, b) => ((a.Created ?? '') < (b.Created ?? '') ? 1 : -1));
}

/** The newest mail to `to` whose text satisfies `accept`; waits up to `timeoutMs` for it to arrive. */
export async function waitForMail(to: string, accept: (text: string) => boolean = () => true, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const message of await mailsTo(to)) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as { Text?: string };
      if (full.Text && accept(full.Text)) return full.Text;
    }
    if (Date.now() > deadline) throw new Error(`No matching mail for ${to} after ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function otpCodeFor(email: string, atLeast: number): Promise<string> {
  const deadline = Date.now() + 15_000;
  for (;;) {
    const mails = await mailsTo(email);
    if (mails.length >= atLeast) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${mails[0].ID}`)).json()) as { Text?: string };
      const match = /(\d{6})/.exec(full.Text ?? '');
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No ${atLeast} OTP mail(s) for ${email} after 15000 ms (found ${mails.length})`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/** The generated password in the account mail (`Password: <value>`, spec §7.4). */
export async function passwordFromMail(email: string): Promise<string> {
  const text = await waitForMail(email, (body) => /Password: \S+/.test(body));
  return /Password: (\S+)/.exec(text)![1];
}

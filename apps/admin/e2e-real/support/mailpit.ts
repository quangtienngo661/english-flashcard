export const MAILPIT = process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025';

type Summary = { ID: string; To?: Array<{ Address: string }>; Created?: string };

/** The newest mail to `to` whose text satisfies `accept`; waits up to `timeoutMs` for it to arrive. */
export async function waitForMail(to: string, accept: (text: string) => boolean = () => true, timeoutMs = 15_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json()) as { messages?: Summary[] };
    for (const message of list.messages ?? []) {
      if (message.To?.[0]?.Address?.toLowerCase() !== to.toLowerCase()) continue;
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json()) as { Text?: string };
      if (full.Text && accept(full.Text)) return full.Text;
    }
    if (Date.now() > deadline) throw new Error(`No matching mail for ${to} after ${timeoutMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

export async function otpCodeFor(email: string): Promise<string> {
  const text = await waitForMail(email, (body) => /\d{6}/.test(body));
  return /(\d{6})/.exec(text)![1];
}

/** The generated password in the account mail (`Password: <value>`, spec §7.4). */
export async function passwordFromMail(email: string): Promise<string> {
  const text = await waitForMail(email, (body) => /Password: \S+/.test(body));
  return /Password: (\S+)/.exec(text)![1];
}

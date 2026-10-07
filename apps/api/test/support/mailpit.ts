import { GenericContainer, Wait } from 'testcontainers';

type MailpitMessage = { to: string; subject: string; text: string };
type MailpitMessageDetail = {
  To: Array<{ Address: string }>;
  Subject: string;
  Text: string;
};

export async function startMailpit(): Promise<{
  smtpHost: string;
  smtpPort: number;
  apiUrl: string;
  stop(): Promise<void>;
}> {
  const container = await new GenericContainer('axllent/mailpit')
    .withExposedPorts(1025, 8025)
    .withWaitStrategy(Wait.forHttp('/api/v1/messages', 8025).forStatusCode(200))
    .withStartupTimeout(30_000)
    .start();

  return {
    smtpHost: container.getHost(),
    smtpPort: container.getMappedPort(1025),
    apiUrl: `http://${container.getHost()}:${container.getMappedPort(8025)}`,
    async stop() {
      await container.stop();
    },
  };
}

async function fetchMailpit<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Mailpit API returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function listMailpitMessages(
  apiUrl: string,
): Promise<MailpitMessage[]> {
  const messages: MailpitMessage[] = [];
  let start = 0;

  // The list is paginated and contains snippets; fetch details for the full text.
  while (true) {
    const page = await fetchMailpit<{
      messages: Array<{ ID: string }>;
      total: number;
    }>(`${apiUrl}/api/v1/messages?start=${start}&limit=50`);

    const details = await Promise.all(
      page.messages.map(({ ID }) =>
        fetchMailpit<MailpitMessageDetail>(
          `${apiUrl}/api/v1/message/${encodeURIComponent(ID)}`,
        ),
      ),
    );
    messages.push(
      ...details.map((message) => ({
        to: message.To.map(({ Address }) => Address).join(', '),
        subject: message.Subject,
        text: message.Text,
      })),
    );

    start += page.messages.length;
    if (page.messages.length === 0 || start >= page.total) {
      return messages;
    }
  }
}

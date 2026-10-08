// E2E must not depend on the machine's real geolocation.
// LP4 sends its own country header.
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir(new URL('../.wrangler/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../.wrangler/e2e-cf.json', import.meta.url),
  JSON.stringify({
    colo: 'SIN',
    asn: 0,
    httpProtocol: 'HTTP/1.1',
    tlsVersion: 'TLSv1.3',
    clientTcpRtt: 0,
  }, null, 2) + '\n',
);

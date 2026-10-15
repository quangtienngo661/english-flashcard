// localhost:3300 inside the container → the API on the Windows host, so the browser talks to http://localhost like in CI.
import net from 'node:net';
net.createServer((c) => { const u = net.connect(3300, 'host.docker.internal'); c.pipe(u).pipe(c); u.on('error', () => c.destroy()); c.on('error', () => u.destroy()); }).listen(3300);

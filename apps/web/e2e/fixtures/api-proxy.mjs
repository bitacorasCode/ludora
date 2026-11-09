// Fault injection for browser tests; the application itself is unchanged.
import http from 'node:http';

const apiUrl = process.env.LUDORA_E2E_API_URL;
if (!apiUrl) throw new Error('LUDORA_E2E_API_URL is required for the browser test proxy.');
const target = new URL(apiUrl);
const proxyPort = Number(process.env.LUDORA_E2E_PROXY_PORT);
if (!Number.isInteger(proxyPort) || proxyPort <= 0) {
  throw new Error('LUDORA_E2E_PROXY_PORT must be a positive port number.');
}
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
  target.protocol !== 'http:'
) {
  throw new Error('E2E tests must target a local HTTP API.');
}
let mode = 'healthy';
const modes = ['healthy', 'unavailable', 'delayed'];

const server = http.createServer(async (request, response) => {
  if (request.url === '/__health') {
    response.writeHead(200).end('ok');
    return;
  }
  if (request.url === '/__control' && request.method === 'POST') {
    let body = '';
    for await (const chunk of request) body += chunk;
    let nextMode;
    try {
      nextMode = JSON.parse(body).mode;
    } catch {
      /* Reject invalid control input. */
    }
    if (!modes.includes(nextMode)) {
      response.writeHead(400).end();
      return;
    }
    mode = nextMode;
    response.writeHead(200).end();
    return;
  }
  if (mode === 'unavailable' && request.url?.startsWith('/auth/')) {
    request.socket.destroy();
    return;
  }
  const forward = () => {
    const upstream = http.request(
      new URL(request.url ?? '/', target),
      {
        method: request.method,
        headers: { ...request.headers, host: target.host },
      },
      (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(response);
      },
    );
    upstream.on('error', () => response.destroy());
    request.pipe(upstream);
  };
  if (mode === 'delayed' && request.url === '/auth/login')
    setTimeout(forward, 1000);
  else forward();
});

server.listen(proxyPort, '127.0.0.1');

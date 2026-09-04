import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const metroPort = Number(process.env.CYKLA_METRO_PORT ?? 8081);
const previewPort = Number(process.env.CYKLA_WEB_PORT ?? 8082);
const expoCli = fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url));

const expo = spawn(process.execPath, [expoCli, 'start', '--web', '--port', String(metroPort)], {
  env: process.env,
  stdio: 'inherit',
});

const proxy = http.createServer((request, response) => {
  const upstream = http.request(
    {
      hostname: '127.0.0.1',
      port: metroPort,
      path: request.url,
      method: request.method,
      headers: request.headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, {
        ...upstreamResponse.headers,
        'cross-origin-embedder-policy': 'require-corp',
        'cross-origin-opener-policy': 'same-origin',
      });
      upstreamResponse.pipe(response);
    },
  );

  upstream.on('error', () => {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Cykla startet noch. Bitte die Seite gleich neu laden.');
  });
  request.pipe(upstream);
});

proxy.on('upgrade', (request, socket, head) => {
  const upstream = net.connect(metroPort, '127.0.0.1', () => {
    const requestLine = `${request.method} ${request.url} HTTP/${request.httpVersion}\r\n`;
    const headers = Object.entries(request.headers)
      .map(([name, value]) => `${name}: ${value}`)
      .join('\r\n');

    upstream.write(`${requestLine}${headers}\r\n\r\n`);
    if (head.length > 0) {
      upstream.write(head);
    }
    socket.pipe(upstream).pipe(socket);
  });

  upstream.on('error', () => socket.destroy());
});

proxy.listen(previewPort, '127.0.0.1', () => {
  console.log(`\nCykla Web-Preview: http://localhost:${previewPort}\n`);
});

function stop() {
  proxy.close();
  expo.kill('SIGTERM');
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
expo.on('exit', (code) => {
  proxy.close();
  process.exitCode = code ?? 0;
});

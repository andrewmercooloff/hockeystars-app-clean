/**
 * Supabase reverse proxy for cPanel / HostFly
 * HTTP + WebSocket (Supabase Realtime)
 */
const http = require('http');
const httpProxy = require('http-proxy');

const PORT = process.env.PORT || 3000;
const SUPABASE_ORIGIN = 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const SUPABASE_HOST = 'jvsypfwiajuwsyuzkyda.supabase.co';

const proxy = httpProxy.createProxyServer({
  target: SUPABASE_ORIGIN,
  changeOrigin: true,
  ws: true,
  secure: true,
  xfwd: true,
});

proxy.on('proxyReq', (proxyReq) => {
  proxyReq.setHeader('Host', SUPABASE_HOST);
});

proxy.on('proxyReqWs', (proxyReq) => {
  proxyReq.setHeader('Host', SUPABASE_HOST);
  proxyReq.setHeader('Origin', SUPABASE_ORIGIN);
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err.message, req?.url || '');
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad gateway', message: err.message }));
  }
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: SUPABASE_ORIGIN });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: SUPABASE_ORIGIN });
});

server.listen(PORT, () => {
  console.log(`Supabase proxy (HTTP+WS) on :${PORT} -> ${SUPABASE_ORIGIN}`);
});

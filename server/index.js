const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  handleStatus,
  handleSpin,
  handleRegister,
  handleLogin,
  handleCouponDraw,
  handleCouponRedeem,
  handleAdminGetConfig,
  handleAdminPutConfig,
  handleAdminStats,
  handleAdminUpdateUser,
} = require('../lib/api');
const { sendJson, readBody } = require('../lib/response');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function toExpressLikeReq(req, url, body) {
  return {
    method: req.method,
    query: Object.fromEntries(url.searchParams),
    body,
    headers: req.headers,
  };
}

function createResAdapter(rawRes) {
  return {
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      sendJson(rawRes, this._status || 200, data);
    },
  };
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(PUBLIC_DIR, urlPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    const expressReq = toExpressLikeReq(req, url, {});
    if (req.method === 'POST' || req.method === 'PUT') {
      expressReq.body = await readBody(req);
    }
    const expressRes = createResAdapter(res);

    if (pathname === '/api/coupon-draw' && req.method === 'POST') return handleCouponDraw(expressReq, expressRes);
    if (pathname === '/api/coupon-redeem' && req.method === 'POST') return handleCouponRedeem(expressReq, expressRes);
    if (pathname === '/api/register' && req.method === 'POST') return handleRegister(expressReq, expressRes);
    if (pathname === '/api/login' && req.method === 'POST') return handleLogin(expressReq, expressRes);
    if (pathname === '/api/status') return handleStatus(expressReq, expressRes);
    if (pathname === '/api/spin') return handleSpin(expressReq, expressRes);
    if (pathname === '/api/admin/config') {
      if (req.method === 'GET') return handleAdminGetConfig(expressReq, expressRes);
      if (req.method === 'PUT') return handleAdminPutConfig(expressReq, expressRes);
    }
    if (pathname === '/api/admin/stats') return handleAdminStats(expressReq, expressRes);
    if (pathname === '/api/admin/users' && req.method === 'PUT') return handleAdminUpdateUser(expressReq, expressRes);

    if (req.method === 'GET') return serveStatic(req, res);

    res.writeHead(405);
    res.end('Method not allowed');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
});

server.listen(PORT, () => {
  console.log(`Lucky Draw server running: http://localhost:${PORT}`);
  console.log(`Admin dashboard: http://localhost:${PORT}/admin.html`);
});

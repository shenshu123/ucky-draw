const {
  handleStatus,
  handleSpin,
  handleAdminGetConfig,
  handleAdminPutConfig,
  handleAdminStats,
} = require('../lib/api');
const { sendJson, readBody } = require('../lib/response');

function parseRequest(req) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  const route = url.pathname.replace(/^\/api\/?/, '');
  const query = { ...req.query };

  url.searchParams.forEach((value, key) => {
    if (key !== 'path' && key !== 'slug') query[key] = value;
  });

  return { route, query };
}

module.exports = async (req, res) => {
  const { route, query } = parseRequest(req);
  req.query = query;
  const method = (req.method || 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    return sendJson(res, 200, {});
  }

  try {
    if (method === 'POST' || method === 'PUT') {
      req.body = await readBody(req);
    }

    if (route === 'status' && method === 'GET') return handleStatus(req, res);
    if (route === 'spin' && method === 'POST') return handleSpin(req, res);
    if (route === 'admin/config' && method === 'GET') return handleAdminGetConfig(req, res);
    if (route === 'admin/config' && method === 'PUT') return handleAdminPutConfig(req, res);
    if (route === 'admin/stats' && method === 'GET') return handleAdminStats(req, res);

    return sendJson(res, 404, { error: 'Not found', route, method });
  } catch (err) {
    return sendJson(res, 500, { error: err.message || 'Server error' });
  }
};

const { readBody } = require('./response');

function parseUrl(req) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  return url;
}

async function normalizeReq(req) {
  const url = parseUrl(req);
  const method = (req.method || 'GET').toUpperCase();

  req.query = {
    ...(req.query || {}),
    ...Object.fromEntries(url.searchParams),
  };

  if (method === 'POST' || method === 'PUT') {
    req.body = await readBody(req);
  }

  req.method = method;
  return req;
}

module.exports = { normalizeReq };

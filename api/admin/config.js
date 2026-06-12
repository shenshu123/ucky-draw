const { handleAdminGetConfig, handleAdminPutConfig } = require('../../lib/api');
const { sendJson } = require('../../lib/response');
const { normalizeReq } = require('../../lib/vercel');

module.exports = async (req, res) => {
  await normalizeReq(req);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    return sendJson(res, 200, {});
  }
  if (req.method === 'GET') return handleAdminGetConfig(req, res);
  if (req.method === 'PUT') return handleAdminPutConfig(req, res);

  return sendJson(res, 405, { error: 'Method not allowed' });
};

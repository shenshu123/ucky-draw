const { handleAdminStats } = require('../../lib/api');
const { sendJson } = require('../../lib/response');
const { normalizeReq } = require('../../lib/vercel');

module.exports = async (req, res) => {
  await normalizeReq(req);

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password');
    return sendJson(res, 200, {});
  }
  if (req.method === 'GET') return handleAdminStats(req, res);

  return sendJson(res, 405, { error: 'Method not allowed' });
};

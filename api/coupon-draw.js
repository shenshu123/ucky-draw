const { handleCouponDraw } = require('../lib/api');
const { sendJson } = require('../lib/response');
const { normalizeReq } = require('../lib/vercel');

module.exports = async (req, res) => {
  await normalizeReq(req);

  if (req.method === 'OPTIONS') return sendJson(res, 200, {});
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

  return handleCouponDraw(req, res);
};

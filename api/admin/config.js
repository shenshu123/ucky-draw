const { handleAdminGetConfig, handleAdminPutConfig } = require('../../lib/api');

module.exports = async (req, res) => {
  if (req.method === 'GET') return handleAdminGetConfig(req, res);
  if (req.method === 'PUT') return handleAdminPutConfig(req, res);
  return res.status(405).json({ error: 'Method not allowed' });
};

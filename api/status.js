const { handleStatus } = require('../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleStatus(req, res);
};

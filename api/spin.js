const { handleSpin } = require('../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleSpin(req, res);
};

const { getConfig, saveConfig, getUserRecord, saveUserRecord, getUsers } = require('./storage');
const { pickPrize } = require('./lottery');
const { sendJson } = require('./response');

const ADMIN_PASSWORD = 'admin123';

function checkAdmin(req, res) {
  const password = req.headers['x-admin-password'] || req.headers['X-Admin-Password'];
  if (password !== ADMIN_PASSWORD) {
    sendJson(res, 401, { error: 'Incorrect admin password' });
    return false;
  }
  return true;
}

async function handleStatus(req, res) {
  const userId = req.query.userId;
  if (!userId) return sendJson(res, 400, { error: 'Missing user ID' });

  const config = await getConfig();
  const user = await getUserRecord(userId);
  const remaining = Math.max(0, config.maxDrawsPerUser - user.drawCount);

  return sendJson(res, 200, {
    remaining,
    maxDraws: config.maxDrawsPerUser,
    used: user.drawCount,
    prizes: config.prizes.map((p) => ({ id: p.id, name: p.name, label: p.label })),
  });
}

async function handleSpin(req, res) {
  const { userId } = req.body || {};
  if (!userId) return sendJson(res, 400, { error: 'Missing user ID' });

  const config = await getConfig();
  const user = await getUserRecord(userId);

  if (user.drawCount >= config.maxDrawsPerUser) {
    return sendJson(res, 403, { error: 'No spins remaining', remaining: 0 });
  }

  const prize = pickPrize(config.prizes);
  const record = {
    drawCount: user.drawCount + 1,
    history: [
      ...user.history,
      { prizeId: prize.id, prizeName: prize.name, prizeLabel: prize.label, time: new Date().toISOString() },
    ],
  };
  await saveUserRecord(userId, record);

  return sendJson(res, 200, {
    prizeIndex: prize.id,
    prize: { name: prize.name, label: prize.label },
    remaining: Math.max(0, config.maxDrawsPerUser - record.drawCount),
  });
}

async function handleAdminGetConfig(req, res) {
  if (!checkAdmin(req, res)) return;
  const config = await getConfig();
  return sendJson(res, 200, { maxDrawsPerUser: config.maxDrawsPerUser, prizes: config.prizes });
}

async function handleAdminPutConfig(req, res) {
  if (!checkAdmin(req, res)) return;
  const config = await getConfig();

  const { maxDrawsPerUser, prizes } = req.body || {};
  if (typeof maxDrawsPerUser !== 'number' || maxDrawsPerUser < 0) {
    return sendJson(res, 400, { error: 'Invalid spins per user setting' });
  }
  if (!Array.isArray(prizes) || prizes.length !== 6) {
    return sendJson(res, 400, { error: 'Prize config must have exactly 6 items' });
  }
  const totalProb = prizes.reduce((sum, p) => sum + (p.probability || 0), 0);
  if (totalProb <= 0) {
    return sendJson(res, 400, { error: 'Total probability weight must be greater than 0' });
  }

  config.maxDrawsPerUser = maxDrawsPerUser;
  config.prizes = prizes.map((p, i) => ({
    id: i,
    name: p.name,
    label: p.label,
    probability: Number(p.probability) || 0,
  }));
  await saveConfig(config);
  return sendJson(res, 200, { success: true, config: { maxDrawsPerUser: config.maxDrawsPerUser, prizes: config.prizes } });
}

async function handleAdminStats(req, res) {
  if (!checkAdmin(req, res)) return;

  const users = await getUsers();
  const entries = Object.entries(users);
  const totalDraws = entries.reduce((sum, [, u]) => sum + u.drawCount, 0);

  return sendJson(res, 200, {
    totalUsers: entries.length,
    totalDraws,
    users: entries.map(([id, u]) => ({
      userId: id.slice(0, 8) + '...',
      drawCount: u.drawCount,
      lastPrize: u.history.length ? u.history[u.history.length - 1] : null,
    })),
  });
}

module.exports = {
  handleStatus,
  handleSpin,
  handleAdminGetConfig,
  handleAdminPutConfig,
  handleAdminStats,
};

const { getConfig, saveConfig, getUserRecord, saveUserRecord, getUsers } = require('./storage');
const { pickPrize } = require('./lottery');

function json(res, status, data) {
  res.status(status).json(data);
}

function checkAdmin(req, res, config) {
  const password = req.headers['x-admin-password'];
  if (password !== config.adminPassword) {
    json(res, 401, { error: 'Incorrect admin password' });
    return false;
  }
  return true;
}

async function handleStatus(req, res) {
  const userId = req.query.userId;
  if (!userId) return json(res, 400, { error: 'Missing user ID' });

  const config = await getConfig();
  const user = await getUserRecord(userId);
  const remaining = Math.max(0, config.maxDrawsPerUser - user.drawCount);

  return json(res, 200, {
    remaining,
    maxDraws: config.maxDrawsPerUser,
    used: user.drawCount,
    prizes: config.prizes.map((p) => ({ id: p.id, name: p.name, label: p.label })),
  });
}

async function handleSpin(req, res) {
  const { userId } = req.body || {};
  if (!userId) return json(res, 400, { error: 'Missing user ID' });

  const config = await getConfig();
  const user = await getUserRecord(userId);

  if (user.drawCount >= config.maxDrawsPerUser) {
    return json(res, 403, { error: 'No spins remaining', remaining: 0 });
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

  return json(res, 200, {
    prizeIndex: prize.id,
    prize: { name: prize.name, label: prize.label },
    remaining: Math.max(0, config.maxDrawsPerUser - record.drawCount),
  });
}

async function handleAdminGetConfig(req, res) {
  const config = await getConfig();
  if (!checkAdmin(req, res, config)) return;
  return json(res, 200, { maxDrawsPerUser: config.maxDrawsPerUser, prizes: config.prizes });
}

async function handleAdminPutConfig(req, res) {
  const config = await getConfig();
  if (!checkAdmin(req, res, config)) return;

  const { maxDrawsPerUser, prizes } = req.body || {};
  if (typeof maxDrawsPerUser !== 'number' || maxDrawsPerUser < 0) {
    return json(res, 400, { error: 'Invalid spins per user setting' });
  }
  if (!Array.isArray(prizes) || prizes.length !== 6) {
    return json(res, 400, { error: 'Prize config must have exactly 6 items' });
  }
  const totalProb = prizes.reduce((sum, p) => sum + (p.probability || 0), 0);
  if (totalProb <= 0) {
    return json(res, 400, { error: 'Total probability weight must be greater than 0' });
  }

  config.maxDrawsPerUser = maxDrawsPerUser;
  config.prizes = prizes.map((p, i) => ({
    id: i,
    name: p.name,
    label: p.label,
    probability: Number(p.probability) || 0,
  }));
  await saveConfig(config);
  return json(res, 200, { success: true, config: { maxDrawsPerUser: config.maxDrawsPerUser, prizes: config.prizes } });
}

async function handleAdminStats(req, res) {
  const config = await getConfig();
  if (!checkAdmin(req, res, config)) return;

  const users = await getUsers();
  const entries = Object.entries(users);
  const totalDraws = entries.reduce((sum, [, u]) => sum + u.drawCount, 0);

  return json(res, 200, {
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

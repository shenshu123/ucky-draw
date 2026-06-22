const {
  getConfig,
  saveConfig,
  getUserRecord,
  saveUserRecord,
  getUsers,
  findUserByUsername,
  createUser,
  getRemaining,
} = require('./storage');
const { pickPrize } = require('./lottery');
const { sendJson } = require('./response');
const { hashPassword, isValidUsername, isValidPassword } = require('./auth');

const ADMIN_PASSWORD = 'admin123';

function checkAdmin(req, res) {
  const password = req.headers['x-admin-password'] || req.headers['X-Admin-Password'];
  if (password !== ADMIN_PASSWORD) {
    sendJson(res, 401, { error: 'Incorrect admin password' });
    return false;
  }
  return true;
}

function publicUser(userId, user) {
  return {
    userId,
    username: user.username,
    remaining: getRemaining(user),
    maxDraws: user.maxDraws,
    used: user.drawCount,
  };
}

async function handleRegister(req, res) {
  const { username, password } = req.body || {};
  if (!isValidUsername(username)) {
    return sendJson(res, 400, { error: 'Username must be 3-20 characters (letters, numbers, underscore)' });
  }
  if (!isValidPassword(password)) {
    return sendJson(res, 400, { error: 'Password must be at least 4 characters' });
  }

  const created = await createUser(username.trim(), hashPassword(password));
  if (!created) {
    return sendJson(res, 409, { error: 'Username already taken' });
  }

  const { userId, user } = created;
  return sendJson(res, 200, {
    ...publicUser(userId, user),
    message: 'Registration successful. Please wait for admin to assign spins.',
  });
}

async function handleLogin(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return sendJson(res, 400, { error: 'Username and password required' });
  }

  const found = await findUserByUsername(username.trim());
  if (!found || found.user.passwordHash !== hashPassword(password)) {
    return sendJson(res, 401, { error: 'Invalid username or password' });
  }

  return sendJson(res, 200, publicUser(found.userId, found.user));
}

async function handleStatus(req, res) {
  const userId = req.query.userId;
  if (!userId) return sendJson(res, 400, { error: 'Please sign in first' });

  const user = await getUserRecord(userId);
  if (!user || !user.username) {
    return sendJson(res, 404, { error: 'User not found' });
  }

  const config = await getConfig();
  return sendJson(res, 200, {
    ...publicUser(userId, user),
    prizes: config.prizes.map((p) => ({ id: p.id, name: p.name, label: p.label })),
  });
}

async function handleSpin(req, res) {
  const { userId } = req.body || {};
  if (!userId) return sendJson(res, 400, { error: 'Please sign in first' });

  const user = await getUserRecord(userId);
  if (!user || !user.username) {
    return sendJson(res, 404, { error: 'User not found' });
  }

  if (getRemaining(user) <= 0) {
    return sendJson(res, 403, { error: 'No spins remaining', remaining: 0 });
  }

  const config = await getConfig();
  const prize = pickPrize(config.prizes);
  const record = {
    drawCount: user.drawCount + 1,
    history: [
      ...user.history,
      { prizeId: prize.id, prizeName: prize.name, prizeLabel: prize.label, time: new Date().toISOString() },
    ],
  };
  const updated = await saveUserRecord(userId, record);

  return sendJson(res, 200, {
    prizeIndex: prize.id,
    prize: { name: prize.name, label: prize.label },
    remaining: getRemaining(updated),
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
  const entries = Object.entries(users).filter(([, u]) => u.username);
  const totalDraws = entries.reduce((sum, [, u]) => sum + (u.drawCount || 0), 0);

  return sendJson(res, 200, {
    totalUsers: entries.length,
    totalDraws,
    users: entries.map(([id, u]) => ({
      userId: id,
      username: u.username,
      maxDraws: u.maxDraws || 0,
      drawCount: u.drawCount || 0,
      remaining: getRemaining(u),
      lastPrize: u.history?.length ? u.history[u.history.length - 1] : null,
      createdAt: u.createdAt,
    })),
  });
}

async function handleAdminUpdateUser(req, res) {
  if (!checkAdmin(req, res)) return;

  const { userId, maxDraws } = req.body || {};
  if (!userId) return sendJson(res, 400, { error: 'User ID required' });
  if (typeof maxDraws !== 'number' || maxDraws < 0) {
    return sendJson(res, 400, { error: 'Invalid spin count' });
  }

  const user = await getUserRecord(userId);
  if (!user || !user.username) {
    return sendJson(res, 404, { error: 'User not found' });
  }

  const updated = await saveUserRecord(userId, { maxDraws });
  return sendJson(res, 200, {
    success: true,
    user: {
      userId,
      username: updated.username,
      maxDraws: updated.maxDraws,
      remaining: getRemaining(updated),
      drawCount: updated.drawCount,
    },
  });
}

module.exports = {
  handleRegister,
  handleLogin,
  handleStatus,
  handleSpin,
  handleAdminGetConfig,
  handleAdminPutConfig,
  handleAdminStats,
  handleAdminUpdateUser,
};

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DEFAULT_CONFIG = require('./default-config');

const CONFIG_KEY = 'lucky_draw:config';
const USERS_KEY = 'lucky_draw:users';
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

let redisClient;

function useRemoteStore() {
  return !!(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );
}

function getRedisCredentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

function getRedis() {
  if (!redisClient) {
    const { Redis } = require('@upstash/redis');
    const { url, token } = getRedisCredentials();
    redisClient = url && token ? new Redis({ url, token }) : Redis.fromEnv();
  }
  return redisClient;
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

async function remoteGet(key) {
  return getRedis().get(key);
}

async function remoteSet(key, value) {
  await getRedis().set(key, value);
}

const FIXED_ADMIN_PASSWORD = 'admin123';

function resolveConfig(config) {
  return {
    ...config,
    adminPassword: FIXED_ADMIN_PASSWORD,
  };
}

function emptyUser() {
  return {
    username: '',
    passwordHash: '',
    maxDraws: 0,
    drawCount: 0,
    history: [],
    createdAt: null,
    coupon: null,
    couponRedeemed: false,
    redeemSpendAmount: null,
    redeemSpinsGranted: null,
  };
}

async function getConfig() {
  if (useRemoteStore()) {
    const stored = await remoteGet(CONFIG_KEY);
    return resolveConfig(stored || { ...DEFAULT_CONFIG });
  }
  return resolveConfig(readJsonFile(CONFIG_PATH, { ...DEFAULT_CONFIG }));
}

async function saveConfig(config) {
  const toSave = {
    ...config,
    adminPassword: FIXED_ADMIN_PASSWORD,
  };
  if (useRemoteStore()) {
    await remoteSet(CONFIG_KEY, toSave);
    return;
  }
  writeJsonFile(CONFIG_PATH, toSave);
}

async function getUsers() {
  if (useRemoteStore()) {
    return (await remoteGet(USERS_KEY)) || {};
  }
  return readJsonFile(USERS_PATH, {});
}

async function saveUsers(users) {
  if (useRemoteStore()) {
    await remoteSet(USERS_KEY, users);
    return;
  }
  writeJsonFile(USERS_PATH, users);
}

async function getUserRecord(userId) {
  const users = await getUsers();
  if (!users[userId]) return null;
  return { ...emptyUser(), ...users[userId] };
}

async function saveUserRecord(userId, updates) {
  const users = await getUsers();
  const current = users[userId] ? { ...emptyUser(), ...users[userId] } : emptyUser();
  users[userId] = { ...current, ...updates };
  await saveUsers(users);
  return users[userId];
}

async function findUserByUsername(username) {
  const users = await getUsers();
  const lower = username.toLowerCase();
  for (const [id, user] of Object.entries(users)) {
    if (user.username && user.username.toLowerCase() === lower) {
      return { userId: id, user: { ...emptyUser(), ...user } };
    }
  }
  return null;
}

async function createUser(username, passwordHash) {
  const existing = await findUserByUsername(username);
  if (existing) return null;

  const userId = crypto.randomUUID();
  const user = {
    username,
    passwordHash,
    maxDraws: 0,
    drawCount: 0,
    history: [],
    createdAt: new Date().toISOString(),
  };
  await saveUserRecord(userId, user);
  return { userId, user };
}

function getRemaining(user) {
  const maxDraws = Number(user.maxDraws) || 0;
  const drawCount = Number(user.drawCount) || 0;
  return Math.max(0, maxDraws - drawCount);
}

module.exports = {
  getConfig,
  saveConfig,
  getUserRecord,
  saveUserRecord,
  getUsers,
  useRemoteStore,
  findUserByUsername,
  createUser,
  getRemaining,
  emptyUser,
};

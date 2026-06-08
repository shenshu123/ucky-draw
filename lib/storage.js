const fs = require('fs');
const path = require('path');
const DEFAULT_CONFIG = require('./default-config');

const CONFIG_KEY = 'lucky_draw:config';
const USERS_KEY = 'lucky_draw:users';
const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');

function useKv() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
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

async function kvGet(key) {
  const { kv } = require('@vercel/kv');
  return kv.get(key);
}

async function kvSet(key, value) {
  const { kv } = require('@vercel/kv');
  await kv.set(key, value);
}

function resolveConfig(config) {
  return {
    ...config,
    adminPassword: process.env.ADMIN_PASSWORD || config.adminPassword || DEFAULT_CONFIG.adminPassword,
  };
}

async function getConfig() {
  if (useKv()) {
    const stored = await kvGet(CONFIG_KEY);
    return resolveConfig(stored || { ...DEFAULT_CONFIG });
  }
  return resolveConfig(readJsonFile(CONFIG_PATH, { ...DEFAULT_CONFIG }));
}

async function saveConfig(config) {
  const toSave = {
    ...config,
    adminPassword: config.adminPassword || DEFAULT_CONFIG.adminPassword,
  };
  if (useKv()) {
    await kvSet(CONFIG_KEY, toSave);
    return;
  }
  writeJsonFile(CONFIG_PATH, toSave);
}

async function getUsers() {
  if (useKv()) {
    return (await kvGet(USERS_KEY)) || {};
  }
  return readJsonFile(USERS_PATH, {});
}

async function saveUsers(users) {
  if (useKv()) {
    await kvSet(USERS_KEY, users);
    return;
  }
  writeJsonFile(USERS_PATH, users);
}

async function getUserRecord(userId) {
  const users = await getUsers();
  return users[userId] || { drawCount: 0, history: [] };
}

async function saveUserRecord(userId, record) {
  const users = await getUsers();
  users[userId] = record;
  await saveUsers(users);
}

module.exports = {
  getConfig,
  saveConfig,
  getUserRecord,
  saveUserRecord,
  getUsers,
  useKv,
};

const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function isValidUsername(username) {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 4;
}

module.exports = { hashPassword, isValidUsername, isValidPassword };

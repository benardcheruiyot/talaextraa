const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

let cachedFallbackSecret = null;

const loadEnv = () => {
  const envPaths = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../backend/.env'),
  ];

  for (const envPath of envPaths) {
    dotenv.config({ path: envPath, override: false });
  }
};

const getStableFallbackSecret = () => {
  const envName = process.env.NODE_ENV === 'production' ? 'TALA_EXTRA_JWT_FALLBACK' : 'TALA_EXTRA_JWT_FALLBACK_DEV';
  const envValue = String(process.env[envName] || '').trim();
  if (envValue) {
    return envValue;
  }

  if (!cachedFallbackSecret) {
    cachedFallbackSecret = crypto.createHash('sha256').update('tala-extra-default-jwt-secret').digest('hex');
  }

  return cachedFallbackSecret;
};

const isValidExpiresIn = (value) => {
  if (!value) return false;
  const raw = String(value).trim();
  if (!raw) return false;

  // Supports plain seconds (e.g. 3600) and time span strings (e.g. 7d, 12h).
  return /^\d+$/.test(raw) || /^\d+(ms|s|m|h|d|w|y)$/i.test(raw);
};

const getJwtSecret = () => {
  loadEnv();
  const envSecret = String(process.env.JWT_SECRET || '').trim();
  if (envSecret) {
    return envSecret;
  }

  const fallbackSecret = getStableFallbackSecret();
  console.warn('[Auth] JWT_SECRET is missing. Using a stable fallback secret.');
  return fallbackSecret;
};

const getJwtVerificationSecrets = () => {
  loadEnv();
  const secrets = [];
  const addSecret = (value) => {
    const normalized = String(value || '').trim();
    if (normalized && !secrets.includes(normalized)) {
      secrets.push(normalized);
    }
  };

  addSecret(process.env.JWT_SECRET);
  addSecret(process.env.TALA_EXTRA_JWT_FALLBACK);
  addSecret(getJwtSecret());
  addSecret(getStableFallbackSecret());
  addSecret('local_dev_jwt_secret_change_me');
  addSecret('tala-extra-default-jwt-secret');

  return secrets;
};

const verifyJwt = (token) => {
  const secrets = getJwtVerificationSecrets();
  let lastError;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to verify JWT token');
};

const getJwtExpiresIn = () => {
  const envValue = String(process.env.JWT_EXPIRE || '').trim();
  if (isValidExpiresIn(envValue)) {
    return envValue;
  }

  if (envValue) {
    console.warn(`[Auth] Invalid JWT_EXPIRE value "${envValue}". Falling back to 7d.`);
  }

  return '7d';
};

module.exports = { getJwtSecret, getJwtExpiresIn, verifyJwt };
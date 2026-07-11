// services/mockupCache.js
// Кэш результатов по хэшу (лого + фото + цвет + модель).
// Одинаковый запрос дважды не оплачивается и не ждёт повторной генерации.
//
// Если задан REDIS_URL — используется Redis (переживает рестарт/масштабирование).
// Иначе — in-memory Map (сбрасывается при рестарте процесса, ок для старта).

const crypto = require('crypto');
const env = require('../config/env');

function buildKey({ productImage, logoImage, color, tier }) {
  const hash = crypto.createHash('sha256');
  hash.update(productImage);
  hash.update(logoImage);
  hash.update(color || 'default');
  hash.update(tier);
  return `mockup:${hash.digest('hex')}`;
}

let backend;

if (env.redisUrl) {
  const Redis = require('ioredis');
  const redis = new Redis(env.redisUrl);

  backend = {
    async get(key) {
      const val = await redis.getBuffer(key);
      return val || null;
    },
    async set(key, buffer, ttlSeconds) {
      await redis.set(key, buffer, 'EX', ttlSeconds);
    },
  };
} else {
  const store = new Map();

  backend = {
    async get(key) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.buffer;
    },
    async set(key, buffer, ttlSeconds) {
      store.set(key, { buffer, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
  };
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // неделя — мокапы не устаревают быстро

async function getCached(params) {
  return backend.get(buildKey(params));
}

async function setCached(params, buffer, ttlSeconds = DEFAULT_TTL_SECONDS) {
  return backend.set(buildKey(params), buffer, ttlSeconds);
}

module.exports = { getCached, setCached, buildKey };

// config/env.js
// Централизованная загрузка и проверка переменных окружения.
// На Railway задаются в Variables, локально — через .env (см. .env.example).

require('dotenv').config();

const required = ['GEMINI_API_KEY'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Отсутствует обязательная переменная окружения: ${key}`);
  }
}

module.exports = {
  geminiApiKey: process.env.GEMINI_API_KEY,

  // Модели по задачам (см. деление на "превью" и "финальный рендер")
  models: {
    preview: process.env.NANO_BANANA_PREVIEW_MODEL || 'gemini-3.1-flash-image',
    final: process.env.NANO_BANANA_FINAL_MODEL || 'gemini-3-pro-image-preview',
  },

  // Лимиты запросов и размеров
  maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 8),

  // Redis опционален — если не задан, используется in-memory кэш
  redisUrl: process.env.REDIS_URL || null,

  port: Number(process.env.PORT || 3000),
};

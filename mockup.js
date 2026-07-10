// routes/mockup.js
// POST /api/mockup/generate
//
// Принимает multipart/form-data:
//   productImage  - файл, фото футболки
//   logoImage     - файл, логотип (png, лучше с прозрачным фоном)
//   color         - опционально, строка ("чёрный", "#1a56db" и т.п.)
//   tier          - "preview" (быстро/дёшево) | "final" (качественно), по умолчанию "preview"
//
// Отвечает image/png. Заголовок X-Cache: HIT | MISS — видно, была ли генерация
// или отдали закэшированный результат.

const express = require('express');
const multer = require('multer');
const env = require('../config/env');
const { generateMockup } = require('../services/nanoBananaClient');
const { getCached, setCached } = require('../services/mockupCache');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
});

// Дедупликация одновременных одинаковых запросов — если два юзера (или два
// клика того же юзера) прилетели с одинаковым хэшем пока первый ещё считается,
// второй просто дожидается результата первого, а не запускает вторую генерацию.
const inFlight = new Map();

router.post(
  '/generate',
  upload.fields([
    { name: 'productImage', maxCount: 1 },
    { name: 'logoImage', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const productFile = req.files?.productImage?.[0];
      const logoFile = req.files?.logoImage?.[0];

      if (!productFile || !logoFile) {
        return res.status(400).json({
          error: 'Нужны оба файла: productImage и logoImage',
        });
      }

      const tier = req.body.tier === 'final' ? 'final' : 'preview';
      const color = req.body.color || null;

      const params = {
        productImage: productFile.buffer,
        logoImage: logoFile.buffer,
        color,
        tier,
      };

      const cached = await getCached(params);
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.type('image/png');
        return res.send(cached);
      }

      const cacheKey = JSON.stringify({
        p: productFile.buffer.length,
        l: logoFile.buffer.length,
        color,
        tier,
      });

      if (inFlight.has(cacheKey)) {
        const buffer = await inFlight.get(cacheKey);
        res.set('X-Cache', 'HIT');
        res.type('image/png');
        return res.send(buffer);
      }

      const genPromise = generateMockup(params).finally(() => {
        inFlight.delete(cacheKey);
      });
      inFlight.set(cacheKey, genPromise);

      const resultBuffer = await genPromise;
      await setCached(params, resultBuffer);

      res.set('X-Cache', 'MISS');
      res.type('image/png');
      return res.send(resultBuffer);
    } catch (err) {
      console.error('Ошибка генерации мокапа:', err);
      return res.status(502).json({
        error: 'Не удалось сгенерировать мокап',
        details: err.message,
      });
    }
  }
);

module.exports = router;

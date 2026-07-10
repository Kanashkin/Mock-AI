// services/nanoBananaClient.js
// Тонкая обёртка над Gemini Image API (Nano Banana / Nano Banana Pro).
// Ключ никогда не покидает бэкенд — фронт его не видит.

const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');

const client = new GoogleGenAI({ apiKey: env.geminiApiKey });

/**
 * Генерирует фотореалистичный мокап: логотип на футболке заданного цвета.
 *
 * @param {Object} params
 * @param {Buffer} params.productImage   - фото футболки (jpeg/png)
 * @param {Buffer} params.logoImage      - логотип (png с прозрачностью)
 * @param {string} [params.color]        - желаемый цвет принта, напр. "чёрный"
 * @param {'preview'|'final'} [params.tier] - какая модель использовать
 * @returns {Promise<Buffer>} PNG-картинка результата
 */
async function generateMockup({ productImage, logoImage, color, tier = 'preview' }) {
  const model = tier === 'final' ? env.models.final : env.models.preview;

  const colorInstruction = color
    ? `Перекрась принт в ${color} цвет, сохранив исходную форму и детали рисунка.`
    : 'Сохрани оригинальный цвет принта.';

  const prompt = [
    'Ты — студийный фотограф-ретушёр. На первом изображении — фото человека в футболке.',
    'На втором изображении — логотип/принт с прозрачным фоном.',
    'Наложи принт на грудь футболки так, будто он реально напечатан на ткани:',
    'учти складки, естественное освещение, лёгкое искривление по поверхности груди, тени.',
    colorInstruction,
    'Не меняй ничего вне области футболки: лицо, фон, позу — оставь как есть.',
    'Верни только готовое фото, без текста и рамок.',
  ].join(' ');

  const response = await client.models.generateContent({
    model,
    contents: [
      { text: prompt },
      { inlineData: { mimeType: 'image/jpeg', data: productImage.toString('base64') } },
      { inlineData: { mimeType: 'image/png', data: logoImage.toString('base64') } },
    ],
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);

  if (!imagePart) {
    throw new Error('Nano Banana не вернул изображение — проверь промпт и лимиты аккаунта');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}

module.exports = { generateMockup };

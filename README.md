# Mockup API

Бэкенд для наложения логотипа на футболку через Nano Banana (Gemini Image API).
Ключ живёт только на сервере — фронт его никогда не видит.

## Деплой на Railway

1. Залей эти файлы в свой репозиторий (или подключи как отдельный сервис).
2. В Railway → Variables добавь:
   - `GEMINI_API_KEY` — ключ из [Google AI Studio](https://aistudio.google.com/apikey)
   - остальное из `.env.example` — по желанию, там есть разумные дефолты
3. Если добавляешь Redis-плагин Railway — просто вставь его `REDIS_URL` в переменные,
   код подхватит его сам. Без Redis тоже работает (кэш в памяти процесса).
4. `npm install && npm start` — Railway это сделает автоматически при пуше.

## Как дергать с фронта

```js
async function generateMockup(productFile, logoFile, color, tier = 'preview') {
  const form = new FormData();
  form.append('productImage', productFile);
  form.append('logoImage', logoFile);
  if (color) form.append('color', color);
  form.append('tier', tier);

  const res = await fetch('/api/mockup/generate', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Ошибка генерации');
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob); // подставить в <img src>
}
```

## Логика вызовов (напоминание из обсуждения)

- **preview** — дёшево и быстро (`gemini-3.1-flash-image`), дергать по кнопке
  "Сгенерировать" или после debounce ~600–800мс, не на каждое движение слайдера.
- **final** — дороже и качественнее (`gemini-3-pro-image-preview`), только на
  реальном экспорте/скачивании.
- Кэш ключуется по хэшу (лого + фото + цвет + tier) — одинаковый запрос
  дважды не платится.
- Параллельные одинаковые запросы (два клика подряд) не запускают вторую
  генерацию — второй просто ждёт результата первого.

## Файлы

| Файл | Что делает |
|---|---|
| `config/env.js` | Загрузка и проверка переменных окружения |
| `services/nanoBananaClient.js` | Вызов Gemini Image API, промпт |
| `services/mockupCache.js` | Кэш по хэшу, Redis или in-memory |
| `routes/mockup.js` | Express-роут `POST /api/mockup/generate` |
| `server.js` | Пример точки входа |

// server.js
// Минимальный пример подключения. Если у тебя уже есть Express-приложение
// (как в Dyadik Challenge), просто скопируй строку app.use(...) в свой server.js —
// остальное не трогай.

const express = require('express');
const mockupRouter = require('./routes/mockup');

const app = express();

app.use('/api/mockup', mockupRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mockup API запущен на порту ${PORT}`);
});

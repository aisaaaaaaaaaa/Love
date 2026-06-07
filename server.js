require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');

const app = express();
app.use(cors()); // разрешаем запросы с фронтенда
app.use(express.json());

// ---- ВСТАВЬ СВОИ ДАННЫЕ ИЗ TWILIO ----
const accountSid = process.env.TWILIO_ACCOUNT_SID;     // из .env
const authToken = process.env.TWILIO_AUTH_TOKEN;       // из .env
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;   // например '+1234567890'

if (!accountSid || !authToken || !twilioPhone) {
  console.error('❌ Ошибка: добавь переменные в .env файл');
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const codeStore = new Map(); // временное хранилище (для продакшена используй Redis/БД)

// Эндпоинт 1: отправка SMS
app.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.match(/^\+\d{10,15}$/)) {
    return res.status(400).json({ ok: false, error: 'Неверный формат номера' });
  }

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  codeStore.set(phone, { code, createdAt: Date.now() });

  try {
    await client.messages.create({
      body: `🔐 Ваш код для входа: ${code}`,
      from: twilioPhone,
      to: phone
    });
    console.log(`✅ Код ${code} отправлен на ${phone}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Twilio error:', err);
    res.status(500).json({ ok: false, error: 'Ошибка отправки SMS. Проверь Twilio баланс/номер.' });
  }
});

// Эндпоинт 2: проверка кода
app.post('/verify-code', (req, res) => {
  const { phone, code } = req.body;
  const record = codeStore.get(phone);
  if (!record) {
    return res.status(400).json({ ok: false, error: 'Код не найден. Запросите новый.' });
  }
  // проверка на истечение времени (10 минут)
  if (Date.now() - record.createdAt > 10 * 60 * 1000) {
    codeStore.delete(phone);
    return res.status(400).json({ ok: false, error: 'Код истёк. Запросите снова.' });
  }
  if (record.code === code) {
    codeStore.delete(phone);
    // здесь можно выдать JWT-токен или создать сессию
    res.json({ ok: true, message: 'Успешная регистрация' });
  } else {
    res.status(400).json({ ok: false, error: 'Неверный код' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
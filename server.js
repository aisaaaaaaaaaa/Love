require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Раздаём статические файлы из текущей папки (где лежит index.html, dashboard.html и т.д.)
app.use(express.static(__dirname));

// Переменные окружения (добавь на Render)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.error('❌ Ошибка: не хватает переменных окружения Twilio');
  process.exit(1);
}

const client = twilio(accountSid, authToken);
const codeStore = new Map();

// Отправка SMS
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
      to: phone,
    });
    console.log(`✅ Код ${code} отправлен на ${phone}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('Twilio error:', err);
    res.status(500).json({ ok: false, error: 'Ошибка отправки SMS' });
  }
});

// Проверка кода
app.post('/verify-code', (req, res) => {
  const { phone, code } = req.body;
  const record = codeStore.get(phone);
  if (!record) {
    return res.status(400).json({ ok: false, error: 'Код не найден. Запросите новый.' });
  }
  if (Date.now() - record.createdAt > 10 * 60 * 1000) {
    codeStore.delete(phone);
    return res.status(400).json({ ok: false, error: 'Код истёк. Запросите снова.' });
  }
  if (record.code === code) {
    codeStore.delete(phone);
    res.json({ ok: true, message: 'Успешная регистрация' });
  } else {
    res.status(400).json({ ok: false, error: 'Неверный код' });
  }
});

// Все остальные GET-запросы отдаём index.html (форму регистрации)
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

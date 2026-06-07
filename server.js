require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Раздаём статические файлы из текущей папки (CSS, JS, изображения)
app.use(express.static(__dirname));

// Переменные окружения (Twilio данные – добавь на Render!)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.error('❌ Ошибка: не хватает переменных окружения Twilio');
  // Не завершаем процесс, чтобы сервер запустился хотя бы для статики
  // Но SMS отправляться не будут.
} else {
  console.log('✅ Twilio переменные загружены');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;
const codeStore = new Map();

// Эндпоинт: отправка SMS
app.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !phone.match(/^\+\d{10,15}$/)) {
    return res.status(400).json({ ok: false, error: 'Неверный формат номера' });
  }

  if (!client) {
    return res.status(500).json({ ok: false, error: 'Сервер не настроен для SMS (нет Twilio ключей)' });
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

// Эндпоинт: проверка кода
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

// ** ГЛАВНОЕ: Fallback для всех GET-запросов (отдаём index.html) **
// Используем middleware без указания пути – он сработает, если предыдущие не обработали запрос
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📁 Статика раздаётся из ${__dirname}`);
});

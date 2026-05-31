const CONFIG = {
  senderName: "Айсултан",
  defaultName: "Красавица",
  calendarDurationHours: 2,
};

const STEPS = ["lock", "question", "accept", "plan", "wheel", "scratch", "contract", "final"];

const RESTAURANTS = [
  "Итальянский вечер",
  "Суши и роллы",
  "Ресторан с видом",
  "Кофейня и десерты",
  "Стейк / гриль",
  "Сюрприз от меня",
  "Паназиатский вайб",
  "Прогулка + кофе",
];

const BONUS_LIST = [
  "💐 Цветы + прогулка после ресторана",
  "🍓 Десерт + красивое фото на память",
  "🌙 Ночная прогулка по Алматы",
  "🎁 Полный сюрприз от меня",
  "☕ Кофе после ужина и честный разговор",
];

const TAUNTS = [
  "нет? не в этой вселенной",
  "кнопка убежала, потому что знает правду",
  "почти, но она быстрее",
  "отказ заблокирован системой",
  "ошибка 404: нет не найдено",
  "судьба сказала нажимать “Да”",
  "кнопка “Нет” ушла в отпуск",
];

const state = {
  step: "lock",
  name: "",
  date: "",
  time: "",
  mood: "",
  restaurant: "",
  bonus: "",
  signed: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const el = {
  cursorLight: $("#cursorLight"),
  toast: $("#toast"),
  soundBtn: $("#soundBtn"),
  progressFill: $("#progressFill"),
  progressLabel: $("#progressLabel"),

  nameInput: $("#nameInput"),
  unlockBtn: $("#unlockBtn"),
  girlNames: $$(".girlName"),

  runZone: $("#runZone"),
  yesBtn: $("#yesBtn"),
  noBtn: $("#noBtn"),
  taunt: $("#taunt"),

  acceptNextBtn: $("#acceptNextBtn"),

  dateInput: $("#dateInput"),
  timeInput: $("#timeInput"),
  moodCards: $$("#moodGrid .mini-card"),
  planError: $("#planError"),
  planNextBtn: $("#planNextBtn"),

  wheelCanvas: $("#wheelCanvas"),
  spinBtn: $("#spinBtn"),
  wheelResult: $("#wheelResult"),
  customRestaurant: $("#customRestaurant"),
  wheelError: $("#wheelError"),
  wheelNextBtn: $("#wheelNextBtn"),

  scratchCanvas: $("#scratchCanvas"),
  scratchPrize: $("#scratchPrize"),
  revealBonusBtn: $("#revealBonusBtn"),
  scratchError: $("#scratchError"),
  scratchNextBtn: $("#scratchNextBtn"),

  signatureCanvas: $("#signatureCanvas"),
  clearSignatureBtn: $("#clearSignatureBtn"),
  signNextBtn: $("#signNextBtn"),
  signError: $("#signError"),

  finalName: $("#finalName"),
  finalSender: $("#finalSender"),
  finalDate: $("#finalDate"),
  finalTime: $("#finalTime"),
  finalMood: $("#finalMood"),
  finalRestaurant: $("#finalRestaurant"),
  finalBonus: $("#finalBonus"),
  countdownText: $("#countdownText"),
  copyBtn: $("#copyBtn"),
  calendarBtn: $("#calendarBtn"),
  shareBtn: $("#shareBtn"),
  restartBtn: $("#restartBtn"),
  statusText: $("#statusText"),
};

let soundEnabled = false;
let audioContext = null;
let countdownTimer = null;
let lastParticle = 0;
let wheelRotation = 0;
let spinning = false;
let scratchReady = false;
let scratchRevealed = false;
let isScratching = false;
let signatureDrawing = false;
let signatureHasInk = false;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function save() {
  localStorage.setItem("dateInviteUltimateV3", JSON.stringify(state));
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem("dateInviteUltimateV3"));
    if (!saved) return;
    Object.assign(state, saved);
    if (!STEPS.includes(state.step)) state.step = "lock";
  } catch {
    localStorage.removeItem("dateInviteUltimateV3");
  }
}

function showToast(text) {
  el.toast.textContent = text;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2500);
}

function beep(kind = "soft") {
  if (!soundEnabled) return;

  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const notes = kind === "success" ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37];

    notes.forEach((freq, i) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.10, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.25);
    });
  } catch {
    soundEnabled = false;
  }
}

function setName(value) {
  state.name = (value || "").trim() || CONFIG.defaultName;
  el.girlNames.forEach((node) => {
    node.textContent = state.name;
  });
  save();
}

function updateProgress() {
  const index = STEPS.indexOf(state.step);
  const percent = Math.round((index / (STEPS.length - 1)) * 100);
  el.progressFill.style.width = `${percent}%`;
  el.progressLabel.textContent = `Mission ${percent}%`;
}

function show(step) {
  state.step = step;
  $$(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${step}`);
  });
  updateProgress();
  save();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (step === "scratch") initScratch();
  if (step === "contract") resizeSignature();
  if (step === "final") renderFinal();
}

function confetti(amount = 100) {
  const colors = ["#ff2f8f", "#7d5cff", "#36d9ff", "#ffd166", "#ffffff"];
  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.45}s`;
    piece.style.animationDuration = `${1.1 + Math.random() * 1.2}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2800);
  }
}

function particle(x, y) {
  const now = Date.now();
  if (now - lastParticle < 65) return;
  lastParticle = now;

  const p = document.createElement("span");
  p.className = "particle";
  p.textContent = Math.random() > 0.5 ? "♡" : "♥";
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 820);
}

function moveNoButton(x = null, y = null) {
  const area = el.runZone.getBoundingClientRect();
  const btn = el.noBtn.getBoundingClientRect();
  const maxLeft = Math.max(0, area.width - btn.width);
  const maxTop = Math.max(0, area.height - btn.height);

  let bestLeft = Math.random() * maxLeft;
  let bestTop = Math.random() * maxTop;
  let bestScore = -Infinity;

  if (x !== null && y !== null) {
    for (let i = 0; i < 130; i++) {
      const left = Math.random() * maxLeft;
      const top = Math.random() * maxTop;
      const cx = area.left + left + btn.width / 2;
      const cy = area.top + top + btn.height / 2;
      const dist = Math.hypot(cx - x, cy - y);
      const centerBonus = 40 - Math.hypot(left - maxLeft / 2, top - maxTop / 2) * 0.05;
      const score = dist + centerBonus;
      if (score > bestScore) {
        bestScore = score;
        bestLeft = left;
        bestTop = top;
      }
    }
  }

  el.noBtn.style.left = `${bestLeft}px`;
  el.noBtn.style.top = `${bestTop}px`;
  el.noBtn.classList.remove("shake");
  void el.noBtn.offsetWidth;
  el.noBtn.classList.add("shake");
  el.taunt.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
}

function protectNo(x, y) {
  if (state.step !== "question") return;
  const rect = el.noBtn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const radius = window.matchMedia("(max-width: 520px)").matches ? 260 : 220;
  if (Math.hypot(cx - x, cy - y) < radius) moveNoButton(x, y);
}

function blockNo(e) {
  e.preventDefault();
  e.stopPropagation();
  const point = e.touches?.[0] || e.changedTouches?.[0] || e;
  moveNoButton(point.clientX || null, point.clientY || null);
  showToast("Отказ отклонён. Попробуй кнопку красивее 😼");
  beep("soft");
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function drawWheel() {
  const canvas = el.wheelCanvas;
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;
  const arc = (Math.PI * 2) / RESTAURANTS.length;
  const colors = ["#ff2f8f", "#7d5cff", "#36d9ff", "#ffd166", "#ff7abb", "#6dffb3", "#b576ff", "#ff8f5a"];

  ctx.clearRect(0, 0, size, size);

  RESTAURANTS.forEach((label, i) => {
    const angle = i * arc - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + arc);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + arc / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.font = "bold 15px system-ui, Arial";
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 6;
    const short = label.length > 16 ? label.slice(0, 16) + "…" : label;
    ctx.fillText(short, radius - 18, 5);
    ctx.restore();
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 56, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(12, 6, 18, .92)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255,255,255,.28)";
  ctx.stroke();
}

function spinWheel() {
  if (spinning) return;

  spinning = true;
  el.wheelError.textContent = "";
  el.spinBtn.textContent = "WAIT";

  const index = Math.floor(Math.random() * RESTAURANTS.length);
  const segment = 360 / RESTAURANTS.length;
  const targetAngle = 360 - (index * segment + segment / 2);
  const spins = 5 + Math.floor(Math.random() * 3);

  wheelRotation += spins * 360 + targetAngle;
  el.wheelCanvas.style.transform = `rotate(${wheelRotation}deg)`;

  setTimeout(() => {
    state.restaurant = RESTAURANTS[index];
    el.wheelResult.textContent = state.restaurant;
    el.spinBtn.textContent = "SPIN";
    spinning = false;
    save();
    beep("success");
    confetti(60);
  }, 3300);
}

function initScratch() {
  if (scratchReady) return;
  scratchReady = true;

  if (!state.bonus) {
    state.bonus = BONUS_LIST[Math.floor(Math.random() * BONUS_LIST.length)];
    save();
  }

  el.scratchPrize.textContent = state.bonus;

  const canvas = el.scratchCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(rect.height * devicePixelRatio);
  ctx.scale(devicePixelRatio, devicePixelRatio);

  const w = rect.width;
  const h = rect.height;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#c0c4d6");
  gradient.addColorStop(0.45, "#f1f3f8");
  gradient.addColorStop(1, "#9ca3b8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(12, 6, 18, 0.75)";
  ctx.font = "900 28px system-ui, Arial";
  ctx.textAlign = "center";
  ctx.fillText("СОТРИ МЕНЯ", w / 2, h / 2 - 8);

  ctx.font = "700 15px system-ui, Arial";
  ctx.fillText("мышкой или пальцем", w / 2, h / 2 + 24);

  ctx.globalCompositeOperation = "destination-out";
}

function scratchAt(x, y) {
  const canvas = el.scratchCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  ctx.beginPath();
  ctx.arc(x - rect.left, y - rect.top, 28, 0, Math.PI * 2);
  ctx.fill();

  checkScratchProgress();
}

function revealScratch() {
  const canvas = el.scratchCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  scratchRevealed = true;
  el.scratchError.textContent = "";
  beep("success");
  confetti(60);
}

function checkScratchProgress() {
  const canvas = el.scratchCanvas;
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 40) {
    if (data[i] === 0) cleared++;
  }
  const ratio = cleared / (data.length / 40);
  if (ratio > 0.42 && !scratchRevealed) {
    scratchRevealed = true;
    el.scratchError.textContent = "";
    beep("success");
    confetti(50);
  }
}

function resizeSignature() {
  const canvas = el.signatureCanvas;
  const rect = canvas.getBoundingClientRect();
  const old = document.createElement("canvas");
  old.width = canvas.width;
  old.height = canvas.height;
  old.getContext("2d").drawImage(canvas, 0, 0);

  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(rect.height * devicePixelRatio);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.fillStyle = "rgba(255,255,255,0)";
  ctx.fillRect(0, 0, rect.width, rect.height);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#140817";
}

function signaturePoint(e) {
  const rect = el.signatureCanvas.getBoundingClientRect();
  const point = e.touches?.[0] || e;
  return { x: point.clientX - rect.left, y: point.clientY - rect.top };
}

function startSignature(e) {
  e.preventDefault();
  signatureDrawing = true;
  signatureHasInk = true;
  const ctx = el.signatureCanvas.getContext("2d");
  const p = signaturePoint(e);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  el.signError.textContent = "";
}

function drawSignature(e) {
  if (!signatureDrawing) return;
  e.preventDefault();
  const ctx = el.signatureCanvas.getContext("2d");
  const p = signaturePoint(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function stopSignature() {
  signatureDrawing = false;
}

function clearSignature() {
  const canvas = el.signatureCanvas;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  signatureHasInk = false;
}

function renderFinal() {
  el.finalName.textContent = state.name || CONFIG.defaultName;
  el.finalSender.textContent = CONFIG.senderName;
  el.finalDate.textContent = formatDate(state.date);
  el.finalTime.textContent = state.time;
  el.finalMood.textContent = state.mood;
  el.finalRestaurant.textContent = state.restaurant;
  el.finalBonus.textContent = state.bonus;

  updateCountdown();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdown, 1000);
}

function getTargetDate() {
  return new Date(`${state.date}T${state.time}:00`);
}

function updateCountdown() {
  if (!state.date || !state.time) {
    el.countdownText.textContent = "—";
    return;
  }

  const diff = getTargetDate().getTime() - Date.now();
  if (diff <= 0) {
    el.countdownText.textContent = "уже пора идти ✨";
    return;
  }

  const total = Math.floor(diff / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  el.countdownText.textContent = `${d} д. ${h} ч. ${m} мин. ${s} сек.`;
}

function planText() {
  return [
    "Официальный план свидания 💖",
    `Для: ${state.name || CONFIG.defaultName}`,
    `От: ${CONFIG.senderName}`,
    `Дата: ${formatDate(state.date)}`,
    `Время: ${state.time}`,
    `Настроение: ${state.mood}`,
    `Место: ${state.restaurant}`,
    `Бонус: ${state.bonus}`,
  ].join("\n");
}

async function copyPlan() {
  const text = planText();
  try {
    await navigator.clipboard.writeText(text);
    el.statusText.textContent = "План скопирован. Можно отправить ей в чат.";
    showToast("План скопирован");
  } catch {
    el.statusText.textContent = text;
  }
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function downloadCalendar() {
  const start = getTargetDate();
  const end = new Date(start.getTime() + CONFIG.calendarDurationHours * 60 * 60 * 1000);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Secret Date Mission//RU",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@secret-date-mission.local`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Свидание с ${state.name || CONFIG.defaultName}`,
    `DESCRIPTION:${planText().replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "secret-date-mission.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Календарь скачан");
}

async function sharePlan() {
  const text = planText();
  if (navigator.share) {
    try {
      await navigator.share({ title: "Secret Date Mission", text });
      return;
    } catch {}
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

function validatePlan() {
  el.planError.textContent = "";

  if (!el.dateInput.value) {
    el.planError.textContent = "Выбери дату.";
    return false;
  }

  if (el.dateInput.value < todayISO()) {
    el.planError.textContent = "Прошлая дата не подходит. Мы не в машине времени.";
    return false;
  }

  if (!el.timeInput.value) {
    el.planError.textContent = "Выбери время.";
    return false;
  }

  const mood = $(".mini-card.selected")?.dataset.value;
  if (!mood) {
    el.planError.textContent = "Выбери настроение вечера.";
    return false;
  }

  state.date = el.dateInput.value;
  state.time = el.timeInput.value;
  state.mood = mood;
  save();
  return true;
}

el.soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  el.soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
  el.soundBtn.setAttribute("aria-pressed", String(soundEnabled));
  beep("soft");
});

el.unlockBtn.addEventListener("click", () => {
  setName(el.nameInput.value);
  show("question");
  beep("soft");
});

el.nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") el.unlockBtn.click();
});

el.yesBtn.addEventListener("click", () => {
  setName(el.nameInput.value || state.name);
  confetti(110);
  beep("success");
  show("accept");
});

el.acceptNextBtn.addEventListener("click", () => show("plan"));

el.moodCards.forEach((card) => {
  card.addEventListener("click", () => {
    el.moodCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    el.planError.textContent = "";
    beep("soft");
  });
});

el.planNextBtn.addEventListener("click", () => {
  if (!validatePlan()) return;
  show("wheel");
});

el.spinBtn.addEventListener("click", spinWheel);

el.customRestaurant.addEventListener("input", () => {
  if (el.customRestaurant.value.trim()) {
    state.restaurant = el.customRestaurant.value.trim();
    el.wheelResult.textContent = state.restaurant;
    el.wheelError.textContent = "";
    save();
  }
});

el.wheelNextBtn.addEventListener("click", () => {
  const custom = el.customRestaurant.value.trim();
  if (custom) state.restaurant = custom;

  if (!state.restaurant) {
    el.wheelError.textContent = "Сначала крути рулетку или напиши свой вариант.";
    return;
  }

  save();
  show("scratch");
});

el.revealBonusBtn.addEventListener("click", revealScratch);

el.scratchNextBtn.addEventListener("click", () => {
  if (!scratchRevealed) {
    el.scratchError.textContent = "Сначала сотри карточку. Иначе где магия?";
    return;
  }
  show("contract");
});

el.scratchCanvas.addEventListener("pointerdown", (e) => {
  isScratching = true;
  scratchAt(e.clientX, e.clientY);
});
el.scratchCanvas.addEventListener("pointermove", (e) => {
  if (isScratching) scratchAt(e.clientX, e.clientY);
});
document.addEventListener("pointerup", () => {
  isScratching = false;
});

el.signatureCanvas.addEventListener("pointerdown", startSignature);
el.signatureCanvas.addEventListener("pointermove", drawSignature);
document.addEventListener("pointerup", stopSignature);
el.signatureCanvas.addEventListener("touchstart", startSignature, { passive: false });
el.signatureCanvas.addEventListener("touchmove", drawSignature, { passive: false });
document.addEventListener("touchend", stopSignature);

el.clearSignatureBtn.addEventListener("click", clearSignature);

el.signNextBtn.addEventListener("click", () => {
  if (!signatureHasInk) {
    el.signError.textContent = "Нужна подпись. Хотя бы сердечко нарисуй.";
    return;
  }
  state.signed = true;
  save();
  confetti(150);
  beep("success");
  show("final");
});

el.copyBtn.addEventListener("click", copyPlan);
el.calendarBtn.addEventListener("click", downloadCalendar);
el.shareBtn.addEventListener("click", sharePlan);

el.restartBtn.addEventListener("click", () => {
  localStorage.removeItem("dateInviteUltimateV3");
  Object.assign(state, {
    step: "lock",
    name: "",
    date: todayISO(),
    time: "",
    mood: "",
    restaurant: "",
    bonus: "",
    signed: false,
  });

  el.nameInput.value = "";
  el.dateInput.value = todayISO();
  el.timeInput.value = "";
  el.customRestaurant.value = "";
  el.wheelResult.textContent = "ещё не крутилось";
  el.statusText.textContent = "";
  el.planError.textContent = "";
  el.wheelError.textContent = "";
  el.scratchError.textContent = "";
  el.signError.textContent = "";

  el.moodCards.forEach((c) => c.classList.remove("selected"));
  clearSignature();
  scratchReady = false;
  scratchRevealed = false;

  show("lock");
});

$$("[data-back]").forEach((button) => {
  button.addEventListener("click", () => show(button.dataset.back));
});

document.addEventListener("mousemove", (e) => {
  el.cursorLight.style.opacity = "1";
  el.cursorLight.style.left = `${e.clientX}px`;
  el.cursorLight.style.top = `${e.clientY}px`;
  particle(e.clientX, e.clientY);
  protectNo(e.clientX, e.clientY);
});

document.addEventListener("pointerdown", (e) => {
  if (state.step !== "question") return;
  const rect = el.noBtn.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (inside) blockNo(e);
}, true);

el.noBtn.addEventListener("click", blockNo);
el.noBtn.addEventListener("mousedown", blockNo);
el.noBtn.addEventListener("mouseenter", (e) => moveNoButton(e.clientX, e.clientY));

window.addEventListener("resize", () => {
  drawWheel();
  if (state.step === "contract") resizeSignature();
});

el.dateInput.min = todayISO();
el.dateInput.value = todayISO();
drawWheel();

load();
setName(state.name);
el.nameInput.value = state.name || "";
el.dateInput.min = todayISO();
el.dateInput.value = state.date || todayISO();
el.timeInput.value = state.time || "";
el.finalSender.textContent = CONFIG.senderName;

if (state.mood) {
  el.moodCards.forEach((card) => card.classList.toggle("selected", card.dataset.value === state.mood));
}

if (state.restaurant) {
  el.wheelResult.textContent = state.restaurant;
}

if (!state.date) state.date = todayISO();

show(state.step || "lock");

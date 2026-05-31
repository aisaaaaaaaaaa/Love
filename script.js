const CONFIG = window.DATE_INVITE_CONFIG || {
  googleScriptUrl: "",
  saveSecret: "",
  senderName: "Айсултан"
};

const STEPS = ["start", "question", "plan", "sign", "final"];

const state = {
  step: "start",
  name: "",
  date: "",
  time: "",
  place: "",
  signed: false,
  submitted: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const el = {
  progressFill: $("#progressFill"),
  toast: $("#toast"),
  resetBtn: $("#resetBtn"),

  nameInput: $("#nameInput"),
  startBtn: $("#startBtn"),
  guestNames: $$(".guestName"),

  questionArea: $("#questionArea"),
  yesBtn: $("#yesBtn"),
  noBtn: $("#noBtn"),
  noHint: $("#noHint"),

  dateInput: $("#dateInput"),
  timeInput: $("#timeInput"),
  quickTimes: $$("#quickTimes button"),
  placeButtons: $$("#placeGrid .place"),
  customPlaceInput: $("#customPlaceInput"),
  planError: $("#planError"),
  planNextBtn: $("#planNextBtn"),

  summaryBox: $("#summaryBox"),
  signatureCanvas: $("#signatureCanvas"),
  clearSignatureBtn: $("#clearSignatureBtn"),
  submitBtn: $("#submitBtn"),
  signError: $("#signError"),

  finalName: $("#finalName"),
  finalDate: $("#finalDate"),
  finalTime: $("#finalTime"),
  finalPlace: $("#finalPlace"),
  copyBtn: $("#copyBtn"),
  calendarBtn: $("#calendarBtn"),
  saveStatus: $("#saveStatus")
};

let signatureDrawing = false;
let signatureHasInk = false;

const taunts = [
  "нет не получится 😼",
  "почти, но нет",
  "кнопка ушла",
  "отказ временно недоступен",
  "судьба против кнопки “Нет”",
  "ошибка 404: отказ не найден"
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function saveLocal() {
  localStorage.setItem("dateInviteV6", JSON.stringify(state));
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem("dateInviteV6"));
    if (!saved || typeof saved !== "object") return;
    Object.assign(state, saved);
    if (!STEPS.includes(state.step)) state.step = "start";
  } catch {
    localStorage.removeItem("dateInviteV6");
  }
}

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

function show(step) {
  state.step = step;

  $$(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${step}`);
  });

  const index = STEPS.indexOf(step);
  const percent = index <= 0 ? 0 : (index / (STEPS.length - 1)) * 100;
  el.progressFill.style.width = `${percent}%`;

  saveLocal();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (step === "sign") {
    renderSummary();
    resizeSignature();
  }

  if (step === "final") {
    renderFinal();
  }
}

function updateName() {
  const name = state.name || "Ты";
  el.guestNames.forEach((item) => {
    item.textContent = name;
  });
}

function confetti(amount = 70) {
  const colors = ["#ff4f9a", "#8b5cff", "#ffd166", "#ffffff"];

  for (let i = 0; i < amount; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    piece.style.animationDuration = `${1.05 + Math.random() * 0.9}s`;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 2400);
  }
}

function moveNoButton(x = null, y = null) {
  const area = el.questionArea.getBoundingClientRect();
  const button = el.noBtn.getBoundingClientRect();

  const maxLeft = Math.max(0, area.width - button.width);
  const maxTop = Math.max(0, area.height - button.height);

  let bestLeft = Math.random() * maxLeft;
  let bestTop = Math.random() * maxTop;
  let bestScore = -Infinity;

  if (x !== null && y !== null) {
    for (let i = 0; i < 100; i++) {
      const left = Math.random() * maxLeft;
      const top = Math.random() * maxTop;
      const centerX = area.left + left + button.width / 2;
      const centerY = area.top + top + button.height / 2;
      const distance = Math.hypot(centerX - x, centerY - y);
      const score = distance - Math.hypot(left - maxLeft / 2, top - maxTop / 2) * 0.04;

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
  el.noHint.textContent = taunts[Math.floor(Math.random() * taunts.length)];
}

function protectNo(x, y) {
  if (state.step !== "question") return;

  const rect = el.noBtn.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const radius = window.matchMedia("(max-width: 560px)").matches ? 245 : 205;

  if (Math.hypot(centerX - x, centerY - y) < radius) {
    moveNoButton(x, y);
  }
}

function blockNo(event) {
  event.preventDefault();
  event.stopPropagation();

  const point = event.touches?.[0] || event.changedTouches?.[0] || event;
  moveNoButton(point.clientX || null, point.clientY || null);
  toast("Нет не принимается 😄");
}

function validatePlan() {
  el.planError.textContent = "";

  if (!el.dateInput.value) {
    el.planError.textContent = "Выбери дату.";
    return false;
  }

  if (el.dateInput.value < todayISO()) {
    el.planError.textContent = "Прошлую дату выбрать нельзя.";
    return false;
  }

  if (!el.timeInput.value) {
    el.planError.textContent = "Выбери время.";
    return false;
  }

  const customPlace = el.customPlaceInput.value.trim();

  if (customPlace) {
    state.place = customPlace;
  }

  if (!state.place) {
    el.planError.textContent = "Выбери место или напиши свой вариант.";
    return false;
  }

  state.date = el.dateInput.value;
  state.time = el.timeInput.value;

  saveLocal();
  return true;
}

function renderSummary() {
  el.summaryBox.innerHTML = `
    <div><strong>Имя:</strong> ${escapeHtml(state.name || "Красавица")}</div>
    <div><strong>Дата:</strong> ${escapeHtml(formatDate(state.date))}</div>
    <div><strong>Время:</strong> ${escapeHtml(state.time)}</div>
    <div><strong>Место:</strong> ${escapeHtml(state.place)}</div>
  `;
}

function resizeSignature() {
  const canvas = el.signatureCanvas;
  const rect = canvas.getBoundingClientRect();

  canvas.width = Math.floor(rect.width * devicePixelRatio);
  canvas.height = Math.floor(rect.height * devicePixelRatio);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#120914";
}

function getPointerPosition(event) {
  const point = event.touches?.[0] || event;
  const rect = el.signatureCanvas.getBoundingClientRect();

  return {
    x: point.clientX - rect.left,
    y: point.clientY - rect.top
  };
}

function startSignature(event) {
  event.preventDefault();

  signatureDrawing = true;
  signatureHasInk = true;
  el.signError.textContent = "";

  const point = getPointerPosition(event);
  const ctx = el.signatureCanvas.getContext("2d");

  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
}

function drawSignature(event) {
  if (!signatureDrawing) return;

  event.preventDefault();

  const point = getPointerPosition(event);
  const ctx = el.signatureCanvas.getContext("2d");

  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

function stopSignature() {
  signatureDrawing = false;
}

function clearSignature() {
  const canvas = el.signatureCanvas;
  const rect = canvas.getBoundingClientRect();
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, rect.width, rect.height);
  signatureHasInk = false;
  el.signError.textContent = "";
}

function getSignatureDataUrl() {
  return el.signatureCanvas.toDataURL("image/png");
}

async function submitToGoogleSheets() {
  const payload = {
    secret: CONFIG.saveSecret,
    name: state.name || "",
    message: "Согласилась на свидание",
    date: state.date || "",
    time: state.time || "",
    mood: "clean v6",
    details: [],
    place: state.place || "",
    bonus: "",
    smile: "",
    signatureDataUrl: getSignatureDataUrl(),
    userAgent: navigator.userAgent,
    pageUrl: location.href,
    sentAt: new Date().toISOString()
  };

  if (!CONFIG.googleScriptUrl) {
    throw new Error("Google Script URL не указан");
  }

  await fetch(CONFIG.googleScriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  state.submitted = true;
  saveLocal();
}

function renderFinal() {
  el.finalName.textContent = state.name || "Красавица";
  el.finalDate.textContent = formatDate(state.date);
  el.finalTime.textContent = state.time;
  el.finalPlace.textContent = state.place;
  el.saveStatus.textContent = state.submitted
    ? "Данные отправлены и сохранены."
    : "Данные отправляются...";
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function planText() {
  return [
    "План свидания 💖",
    `Имя: ${state.name || "Красавица"}`,
    `Дата: ${formatDate(state.date)}`,
    `Время: ${state.time}`,
    `Место: ${state.place}`
  ].join("\n");
}

async function copyPlan() {
  try {
    await navigator.clipboard.writeText(planText());
    toast("План скопирован");
  } catch {
    toast("Не получилось скопировать");
  }
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function downloadCalendar() {
  const start = new Date(`${state.date}T${state.time}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Date Invite V6//RU",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@date-invite-v6.local`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:Свидание с ${state.name || "Красавица"}`,
    `LOCATION:${state.place}, Алматы`,
    `DESCRIPTION:${planText().replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "date-plan.ics";
  link.click();

  URL.revokeObjectURL(url);
}

function resetAll() {
  localStorage.removeItem("dateInviteV6");

  Object.assign(state, {
    step: "start",
    name: "",
    date: todayISO(),
    time: "",
    place: "",
    signed: false,
    submitted: false
  });

  el.nameInput.value = "";
  el.dateInput.value = todayISO();
  el.timeInput.value = "";
  el.customPlaceInput.value = "";
  el.planError.textContent = "";
  el.signError.textContent = "";
  el.placeButtons.forEach((button) => button.classList.remove("active"));
  el.quickTimes.forEach((button) => button.classList.remove("active"));

  clearSignature();
  updateName();
  show("start");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

el.startBtn.addEventListener("click", () => {
  state.name = el.nameInput.value.trim() || "Красавица";
  updateName();
  saveLocal();
  show("question");
});

el.nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    el.startBtn.click();
  }
});

el.yesBtn.addEventListener("click", () => {
  confetti(90);
  show("plan");
});

el.noBtn.addEventListener("click", blockNo);
el.noBtn.addEventListener("mousedown", blockNo);
el.noBtn.addEventListener("mouseenter", (event) => moveNoButton(event.clientX, event.clientY));

document.addEventListener("mousemove", (event) => {
  protectNo(event.clientX, event.clientY);
});

document.addEventListener("pointerdown", (event) => {
  if (state.step !== "question") return;

  const rect = el.noBtn.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (inside) {
    blockNo(event);
  }
}, true);

el.quickTimes.forEach((button) => {
  button.addEventListener("click", () => {
    el.quickTimes.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    el.timeInput.value = button.dataset.time;
  });
});

el.timeInput.addEventListener("change", () => {
  el.quickTimes.forEach((button) => {
    button.classList.toggle("active", button.dataset.time === el.timeInput.value);
  });
});

el.placeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    el.placeButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    el.customPlaceInput.value = "";
    state.place = button.dataset.value;
    el.planError.textContent = "";
    saveLocal();
  });
});

el.customPlaceInput.addEventListener("input", () => {
  const value = el.customPlaceInput.value.trim();

  if (value) {
    el.placeButtons.forEach((button) => button.classList.remove("active"));
    state.place = value;
    saveLocal();
  }
});

el.planNextBtn.addEventListener("click", () => {
  if (!validatePlan()) return;
  show("sign");
});

el.clearSignatureBtn.addEventListener("click", clearSignature);

el.signatureCanvas.addEventListener("pointerdown", startSignature);
el.signatureCanvas.addEventListener("pointermove", drawSignature);
document.addEventListener("pointerup", stopSignature);

el.signatureCanvas.addEventListener("touchstart", startSignature, { passive: false });
el.signatureCanvas.addEventListener("touchmove", drawSignature, { passive: false });
document.addEventListener("touchend", stopSignature);

el.submitBtn.addEventListener("click", async () => {
  if (!signatureHasInk) {
    el.signError.textContent = "Нужна подпись. Можно просто сердечко.";
    return;
  }

  el.submitBtn.disabled = true;
  el.submitBtn.textContent = "Сохраняю...";

  state.signed = true;
  saveLocal();

  try {
    await submitToGoogleSheets();
    confetti(100);
    show("final");
    renderFinal();
  } catch (error) {
    el.signError.textContent = "Не получилось отправить данные. Проверь интернет или URL.";
    console.error(error);
  } finally {
    el.submitBtn.disabled = false;
    el.submitBtn.textContent = "Подтвердить";
  }
});

el.copyBtn.addEventListener("click", copyPlan);
el.calendarBtn.addEventListener("click", downloadCalendar);
el.resetBtn.addEventListener("click", resetAll);

$$("[data-back]").forEach((button) => {
  button.addEventListener("click", () => {
    show(button.dataset.back);
  });
});

window.addEventListener("resize", () => {
  if (state.step === "sign") {
    resizeSignature();
  }
});

el.dateInput.min = todayISO();
el.dateInput.value = todayISO();

loadLocal();

if (!state.date) {
  state.date = todayISO();
}

el.nameInput.value = state.name || "";
el.dateInput.min = todayISO();
el.dateInput.value = state.date;
el.timeInput.value = state.time || "";
el.customPlaceInput.value = state.place && ![...el.placeButtons].some((button) => button.dataset.value === state.place)
  ? state.place
  : "";

el.quickTimes.forEach((button) => {
  button.classList.toggle("active", button.dataset.time === state.time);
});

el.placeButtons.forEach((button) => {
  button.classList.toggle("active", button.dataset.value === state.place);
});

updateName();
show(state.step || "start");

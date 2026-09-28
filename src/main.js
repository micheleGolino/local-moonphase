import * as Astronomy from "astronomy-engine";
import "./styles.css";

const SYNODIC_MONTH_DAYS = 29.530588853;

const moonCanvas = document.getElementById("moonCanvas");
const earthCanvas = document.getElementById("earthCanvas");

const datePicker = document.getElementById("datePicker");
const prevDayButton = document.getElementById("prevDay");
const nextDayButton = document.getElementById("nextDay");
const todayButton = document.getElementById("todayBtn");

const moonPhaseName = document.getElementById("moonPhaseName");
const moonPhaseData = document.getElementById("moonPhaseData");
const earthPhaseName = document.getElementById("earthPhaseName");
const earthPhaseData = document.getElementById("earthPhaseData");
const summaryLine = document.getElementById("summaryLine");
const statusBadge = document.getElementById("statusBadge");

const moonAngleData = document.getElementById("moonAngleData");
const earthAngleData = document.getElementById("earthAngleData");
const moonMeter = document.getElementById("moonMeter");
const earthMeter = document.getElementById("earthMeter");

const moonCard = document.getElementById("moonCard");
const earthCard = document.getElementById("earthCard");

const moonOrbitRing = document.querySelector(".orbit-moon .orbit-ring");
const earthOrbitRing = document.querySelector(".orbit-earth .orbit-ring");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentMoonAngle = null;

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateFromPicker(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function normalizeAngle(angleDegrees) {
  return ((angleDegrees % 360) + 360) % 360;
}

function getIlluminationFraction(phaseAngleDegrees) {
  const phaseRadians = (phaseAngleDegrees * Math.PI) / 180;
  return (1 - Math.cos(phaseRadians)) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function shortestAngleDelta(from, to) {
  let delta = (to - from + 540) % 360 - 180;
  if (delta === -180) {
    delta = 180;
  }
  return delta;
}

function getPhaseLabel(angleDegrees, subject) {
  const labelsMoon = [
    "Luna nuova",
    "Falce crescente",
    "Primo quarto",
    "Gibbosa crescente",
    "Luna piena",
    "Gibbosa calante",
    "Ultimo quarto",
    "Falce calante"
  ];

  const labelsEarth = [
    "Terra nuova",
    "Falce terrestre crescente",
    "Primo quarto terrestre",
    "Gibbosa terrestre crescente",
    "Terra piena",
    "Gibbosa terrestre calante",
    "Ultimo quarto terrestre",
    "Falce terrestre calante"
  ];

  const band = Math.floor(((normalizeAngle(angleDegrees) + 22.5) % 360) / 45);
  return subject === "earth" ? labelsEarth[band] : labelsMoon[band];
}

function drawPhaseDisk(canvas, phaseAngleDegrees, options) {
  const ctx = canvas.getContext("2d");
  const { brightColor, darkColor, glowColor, invert } = options;

  const width = canvas.width;
  const height = canvas.height;
  const radius = Math.min(width, height) * 0.43;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);

  const phaseRadians = (normalizeAngle(phaseAngleDegrees) * Math.PI) / 180;
  const cosPhase = Math.cos(phaseRadians);
  const waxing = normalizeAngle(phaseAngleDegrees) < 180;

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  const shadowGradient = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.45, radius * 0.15, cx, cy, radius * 1.2);
  shadowGradient.addColorStop(0, glowColor);
  shadowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = shadowGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = darkColor;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.fillStyle = brightColor;

  const step = 1;
  for (let y = -radius; y <= radius; y += step) {
    const xMax = Math.sqrt(radius * radius - y * y);
    const boundary = cosPhase * xMax;

    let xStart;
    let xEnd;

    if (invert) {
      if (waxing) {
        xStart = -xMax;
        xEnd = boundary;
      } else {
        xStart = -boundary;
        xEnd = xMax;
      }
    } else {
      if (waxing) {
        xStart = boundary;
        xEnd = xMax;
      } else {
        xStart = -xMax;
        xEnd = -boundary;
      }
    }

    ctx.fillRect(cx + xStart, cy + y, Math.max(0, xEnd - xStart), step + 0.4);
  }

  ctx.restore();

  const edge = ctx.createRadialGradient(cx - radius * 0.5, cy - radius * 0.5, radius * 0.2, cx, cy, radius);
  edge.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  edge.addColorStop(1, "rgba(0, 0, 0, 0.36)");

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function animatePhaseTransition(targetMoonAngle, targetDate) {
  if (currentMoonAngle === null || prefersReducedMotion) {
    currentMoonAngle = targetMoonAngle;
    updateVisualState(currentMoonAngle, targetDate);
    return;
  }

  const start = currentMoonAngle;
  const delta = shortestAngleDelta(start, targetMoonAngle);
  const duration = 640;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = easeOutCubic(progress);
    const frameAngle = normalizeAngle(start + delta * eased);

    updateVisualState(frameAngle, targetDate);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      currentMoonAngle = targetMoonAngle;
      statusBadge.textContent = "Allineamento completato";
    }
  }

  statusBadge.textContent = "Sincronizzazione delle fasi";
  requestAnimationFrame(step);
}

function pulseCards() {
  moonCard.classList.remove("flash");
  earthCard.classList.remove("flash");

  void moonCard.offsetWidth;

  moonCard.classList.add("flash");
  earthCard.classList.add("flash");
}

function updateMetersAndOrbit(moonAngle, earthAngle, moonIllumination, earthIllumination) {
  moonMeter.style.width = `${(moonIllumination * 100).toFixed(2)}%`;
  earthMeter.style.width = `${(earthIllumination * 100).toFixed(2)}%`;

  moonOrbitRing.style.setProperty("--orbit-angle", `${moonAngle.toFixed(2)}deg`);
  earthOrbitRing.style.setProperty("--orbit-angle", `${earthAngle.toFixed(2)}deg`);

  moonAngleData.textContent = `${moonAngle.toFixed(1)}°`;
  earthAngleData.textContent = `${earthAngle.toFixed(1)}°`;
}

function updateVisualState(moonPhaseAngle, date) {
  const moonAngle = normalizeAngle(moonPhaseAngle);
  const earthPhaseAngle = normalizeAngle(moonAngle + 180);

  const moonIllumination = getIlluminationFraction(moonAngle);
  const earthIllumination = getIlluminationFraction(earthPhaseAngle);

  drawPhaseDisk(moonCanvas, moonAngle, {
    brightColor: "#efe7cc",
    darkColor: "#1b1e29",
    glowColor: "rgba(255, 241, 190, 0.28)",
    invert: false
  });

  drawPhaseDisk(earthCanvas, earthPhaseAngle, {
    brightColor: "#85b4d8",
    darkColor: "#12273d",
    glowColor: "rgba(129, 197, 255, 0.25)",
    invert: true
  });

  moonPhaseName.textContent = getPhaseLabel(moonAngle, "moon");
  moonPhaseData.textContent = `Illuminazione: ${(moonIllumination * 100).toFixed(1)}% • Età lunare: ${((moonAngle / 360) * SYNODIC_MONTH_DAYS).toFixed(1)} giorni`;

  earthPhaseName.textContent = getPhaseLabel(earthPhaseAngle, "earth");
  earthPhaseData.textContent = `Illuminazione: ${(earthIllumination * 100).toFixed(1)}% • Angolo fase: ${earthPhaseAngle.toFixed(1)}°`;

  updateMetersAndOrbit(moonAngle, earthPhaseAngle, moonIllumination, earthIllumination);

  summaryLine.textContent = `Data selezionata: ${date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  })}. Le fasi sono calcolate localmente con Astronomy Engine.`;
}

function renderForDate(date) {
  const moonPhaseAngle = normalizeAngle(Astronomy.MoonPhase(date));
  animatePhaseTransition(moonPhaseAngle, date);
  pulseCards();
}

function shiftCurrentDate(days) {
  const selectedDate = parseDateFromPicker(datePicker.value);
  selectedDate.setDate(selectedDate.getDate() + days);
  datePicker.value = toIsoDate(selectedDate);
  renderForDate(selectedDate);
}

function initialize() {
  const today = new Date();
  datePicker.value = toIsoDate(today);
  currentMoonAngle = normalizeAngle(Astronomy.MoonPhase(parseDateFromPicker(datePicker.value)));
  updateVisualState(currentMoonAngle, parseDateFromPicker(datePicker.value));
  statusBadge.textContent = "Pronto per la regolazione";

  datePicker.addEventListener("change", () => {
    renderForDate(parseDateFromPicker(datePicker.value));
  });

  prevDayButton.addEventListener("click", () => shiftCurrentDate(-1));
  nextDayButton.addEventListener("click", () => shiftCurrentDate(1));

  todayButton.addEventListener("click", () => {
    const now = new Date();
    datePicker.value = toIsoDate(now);
    renderForDate(parseDateFromPicker(datePicker.value));
  });
}

initialize();

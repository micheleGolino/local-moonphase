import * as Astronomy from "astronomy-engine";
import "./styles.css";

const SYNODIC_MONTH_DAYS = 29.530588853;

// Where the clean full-disc lives inside each Swatch texture (fractions of image size).
const EARTH_TEX = { cx: 0.38, cy: 0.44, r: 0.19 };
const MOON_TEX = { cx: 0.5, cy: 0.22, r: 0.17 };

const dateLabel = document.getElementById("dateLabel");
const countdown = document.getElementById("countdown");
const datePicker = document.getElementById("datePicker");
const todayBtn = document.getElementById("todayBtn");
const prevDate = document.getElementById("prevDate");
const nextDate = document.getElementById("nextDate");
const themeSwitch = document.getElementById("themeSwitch");

const card = document.querySelector(".card");
const earthCanvas = document.getElementById("earthCanvas");
const moonCanvas = document.getElementById("moonCanvas");
const earthTex = document.getElementById("earthTex");
const moonTex = document.getElementById("moonTex");

const moonPhaseName = document.getElementById("moonPhaseName");
const moonIllum = document.getElementById("moonIllum");
const earthPhaseName = document.getElementById("earthPhaseName");
const earthIllum = document.getElementById("earthIllum");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let currentMoonPhase = null;
let animationFrame = null;

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

function shortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getIlluminationFraction(phaseAngleDegrees) {
  const phaseRadians = (phaseAngleDegrees * Math.PI) / 180;
  return (1 - Math.cos(phaseRadians)) / 2;
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

// "Earth new" (from the Moon) happens at Full Moon = phase 180.
function daysToNextEarthNew(date) {
  const next = Astronomy.SearchMoonPhase(180, date, 40);
  if (!next) {
    return null;
  }
  const diffDays = (next.date.getTime() - date.getTime()) / 86400000;
  return Math.max(0, Math.round(diffDays));
}

function formatCountdown(days) {
  if (days === null) {
    return "Prossima Terra nuova";
  }
  if (days === 0) {
    return "Oggi è Terra nuova";
  }
  if (days === 1) {
    return "1 giorno alla Terra nuova";
  }
  return `${days} giorni alla Terra nuova`;
}

// Draws a spherical body: photographic texture from the Swatch image, then a
// dark shadow following the real terminator for the given phase angle
// (0 = new/dark, 180 = full/lit).
function drawBody(canvas, texImage, tex, phaseAngleDegrees) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const radius = Math.min(width, height) * 0.47;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (texImage && texImage.complete && texImage.naturalWidth > 0) {
    const srcR = tex.r * texImage.naturalWidth;
    const srcX = tex.cx * texImage.naturalWidth - srcR;
    const srcY = tex.cy * texImage.naturalHeight - srcR;
    ctx.drawImage(texImage, srcX, srcY, srcR * 2, srcR * 2, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = "#5c6b78";
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  }

  const norm = normalizeAngle(phaseAngleDegrees);
  const phase = (norm * Math.PI) / 180;
  const cosP = Math.cos(phase);
  const waxing = norm < 180;

  ctx.fillStyle = "rgba(3, 5, 9, 0.95)";
  const step = 1;
  for (let y = -radius; y <= radius; y += step) {
    const xMax = Math.sqrt(Math.max(0, radius * radius - y * y));

    let litStart;
    let litEnd;
    if (waxing) {
      litStart = cosP * xMax;
      litEnd = xMax;
    } else {
      litStart = -xMax;
      litEnd = -cosP * xMax;
    }

    if (litStart > -xMax) {
      ctx.fillRect(cx - xMax, cy + y, litStart + xMax, step + 0.6);
    }
    if (litEnd < xMax) {
      ctx.fillRect(cx + litEnd, cy + y, xMax - litEnd, step + 0.6);
    }
  }

  // Soft terminator shading for a rounder look.
  const shade = ctx.createLinearGradient(cx - radius, 0, cx + radius, 0);
  shade.addColorStop(0, "rgba(0,0,0,0.26)");
  shade.addColorStop(0.5, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.26)");
  ctx.fillStyle = shade;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.restore();

  // Rim light.
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = Math.max(1, radius * 0.02);
  ctx.stroke();
}

function renderPhase(moonPhaseAngle) {
  const moonAngle = normalizeAngle(moonPhaseAngle);
  const earthAngle = normalizeAngle(moonAngle + 180);
  drawBody(moonCanvas, moonTex, MOON_TEX, moonAngle);
  drawBody(earthCanvas, earthTex, EARTH_TEX, earthAngle);
}

function updateReadout(date, moonPhaseAngle) {
  const moonAngle = normalizeAngle(moonPhaseAngle);
  const earthAngle = normalizeAngle(moonAngle + 180);

  dateLabel.textContent = date.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  countdown.textContent = formatCountdown(daysToNextEarthNew(date));

  moonPhaseName.textContent = getPhaseLabel(moonAngle, "moon");
  moonIllum.textContent = `${(getIlluminationFraction(moonAngle) * 100).toFixed(0)}% • ${(
    (moonAngle / 360) *
    SYNODIC_MONTH_DAYS
  ).toFixed(1)} giorni`;

  earthPhaseName.textContent = getPhaseLabel(earthAngle, "earth");
  earthIllum.textContent = `${(getIlluminationFraction(earthAngle) * 100).toFixed(0)}%`;
}

function animateTo(targetMoonPhase) {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (currentMoonPhase === null || prefersReducedMotion) {
    currentMoonPhase = targetMoonPhase;
    renderPhase(currentMoonPhase);
    return;
  }

  const start = currentMoonPhase;
  const delta = shortestAngleDelta(normalizeAngle(start), normalizeAngle(targetMoonPhase));
  const duration = 780;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = easeInOutCubic(progress);
    renderPhase(start + delta * eased);
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step);
    } else {
      currentMoonPhase = normalizeAngle(targetMoonPhase);
      animationFrame = null;
    }
  }

  animationFrame = requestAnimationFrame(step);
}

function pulseCard() {
  if (prefersReducedMotion) {
    return;
  }
  card.classList.remove("pulse");
  void card.offsetWidth;
  card.classList.add("pulse");
}

function updateView(date, animate) {
  const moonPhaseAngle = normalizeAngle(Astronomy.MoonPhase(date));
  updateReadout(date, moonPhaseAngle);
  if (animate) {
    animateTo(moonPhaseAngle);
    pulseCard();
  } else {
    currentMoonPhase = moonPhaseAngle;
    renderPhase(moonPhaseAngle);
  }
}

function refresh(animate) {
  updateView(parseDateFromPicker(datePicker.value), animate);
}

function shiftDay(days) {
  const selected = parseDateFromPicker(datePicker.value);
  selected.setDate(selected.getDate() + days);
  datePicker.value = toIsoDate(selected);
  refresh(true);
}

function initialize() {
  datePicker.value = toIsoDate(new Date());
  refresh(false);

  // Redraw once textures finish loading so the first paint shows the photo.
  [earthTex, moonTex].forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", () => renderPhase(currentMoonPhase ?? 0), { once: true });
    }
  });

  datePicker.addEventListener("change", () => refresh(true));
  prevDate.addEventListener("click", () => shiftDay(-1));
  nextDate.addEventListener("click", () => shiftDay(1));
  todayBtn.addEventListener("click", () => {
    datePicker.value = toIsoDate(new Date());
    refresh(true);
  });

  themeSwitch.addEventListener("click", () => {
    const isOn = themeSwitch.getAttribute("aria-checked") === "true";
    themeSwitch.setAttribute("aria-checked", String(!isOn));
    document.body.classList.toggle("is-day", !isOn);
  });
}

initialize();

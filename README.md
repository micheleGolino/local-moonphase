# Local Moonphase

A local-first web app to visualize Moon phase and Earth phase for any date, designed as a personal helper to set an Omega x Swatch Moonphase watch.

## Features

- Swatch-inspired card UI: large Earth disc, small Moon disc, lunar surface backdrop
- Photographic Moon and Earth rendered on canvas with an accurate, animated terminator
- Countdown to the next "Earth new" (Full Moon) and full phase readout
- Date selector with quick navigation (previous day, next day, today)
- Day/night theme toggle
- Default date is always the current day
- Local calculations powered by an existing astronomy math library: `astronomy-engine`
- Respects `prefers-reduced-motion`

## Tech Stack

- Vite
- Vanilla JavaScript (ES modules)
- astronomy-engine
- HTML5 Canvas for dynamic phase rendering

## Run Locally

### Option 1: scripts

- Windows: run `start-local.bat`
- macOS/Linux: run `chmod +x start-local.sh && ./start-local.sh`

### Option 2: npm

```bash
npm install
npm run dev
```

Then open the URL shown in your terminal (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Notes

- This is a personal utility project and is not affiliated with Swatch/Omega.
- Earth phase is the complementary phase of the Moon phase.
- Phase math runs fully locally. The Moon/Earth photo textures and the lunar
  background are loaded from Swatch's public CDN for visual fidelity, so the
  imagery needs an internet connection; the phase calculation itself works offline.

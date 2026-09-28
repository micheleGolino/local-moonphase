# Local Moonphase

A local-first web app to visualize Moon phase and Earth phase for any date, designed as a personal helper to set an Omega x Swatch Moonphase watch.

## Features

- Moon phase and Earth phase visualized side by side
- Date selector with quick navigation (`-1 day`, `+1 day`, `today`)
- Default date is always the current day
- Local calculations powered by an existing astronomy math library: `astronomy-engine`
- Works fully in local mode once dependencies are installed

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

- This is a personal utility project and is not affiliated with Swatch.
- Earth phase is represented as the complementary phase of the Moon phase.

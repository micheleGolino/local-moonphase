@echo off
setlocal
cd /d %~dp0

if not exist node_modules (
  echo Installing dependencies...
  npm install
)

echo Starting Local Moonphase on http://localhost:5173
npm run dev -- --host --open

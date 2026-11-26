@echo off
title Campus Feedback Intelligence System Launcher
echo ========================================================
echo   Starting Campus Feedback Intelligence System
echo   J.C. Bose UST, YMCA - B.Tech Capstone
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server (FastAPI on Port 8000)...
start "Campus Feedback - Backend API" cmd /k "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend Server (Vite on Port 5173)...
start "Campus Feedback - Frontend Web" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting 4 seconds for servers to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ========================================================
echo   System is Running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000/api/docs
echo ========================================================
echo.

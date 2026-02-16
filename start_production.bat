@echo off
echo ===================================
echo     PREPARING PRODUCTION BUILD
echo ===================================

cd frontend
echo [1/3] Building Frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Error building frontend
    pause
    exit /b %errorlevel%
)
cd ..

cd backend
echo [2/3] Compiling Backend...
call npx tsc
if %errorlevel% neq 0 (
    echo Error compiling backend
    pause
    exit /b %errorlevel%
)

echo [3/3] Starting Server...
echo.
echo Server will be available at: http://localhost:3000
echo To share, run in another terminal: ngrok http 3000
echo.

node dist/index.js
pause

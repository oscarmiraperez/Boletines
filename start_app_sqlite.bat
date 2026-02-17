@echo off
echo ==========================================
echo      GRAVITY - Starting Application (SQLite)
echo ==========================================

cd backend
if not exist dev.db (
    echo [ERROR] Database dev.db not found!
    echo Running migration...
    call npx prisma db push
    call npx prisma db seed
)

echo [1/2] Starting Backend...
start "GRAVITY Backend" npm run dev

cd ../frontend
echo [2/2] Starting Frontend...
start "GRAVITY Frontend" npm run dev

echo.
echo Application started!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3000
echo.
pause

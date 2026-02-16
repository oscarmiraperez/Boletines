@echo off
echo ==========================================
echo      GRAVITY - Instalacion Automatica
echo ==========================================

echo [1/4] Instalando dependencias del Backend...
cd backend
if not exist .env copy .env.example .env
call npm install
if %errorlevel% neq 0 (
    echo Error instalando backend. Revisa si nodejs esta instalado.
    pause
    exit /b %errorlevel%
)

echo [2/4] Configurando Base de Datos (SQLite)...
call npx prisma generate
call npx prisma db push

echo [3/4] Instalando dependencias del Frontend...
cd ../frontend
if not exist .env echo VITE_API_URL=http://localhost:3000/api > .env
call npm install

echo [4/4] Todo listo!
echo.
echo Para iniciar en modo produccion: start_production.bat
echo Para iniciar en modo desarrollo: usa dos terminales (npm run dev en backend y frontend)
echo.
pause

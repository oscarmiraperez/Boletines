@echo off
echo ==========================================
echo      GRAVITY - Backend Fix
echo ==========================================

cd backend

echo [1/3] Instalando dependencias de nuevo (por seguridad)...
call npm install

echo [2/3] Compilando codigo TypeScript a JavaScript...
call npm run build
if %errorlevel% neq 0 (
    echo Error al compilar.
    pause
    exit /b %errorlevel%
)

echo [3/3] Iniciando servidor Backend (Modo Produccion)...
echo Si ves "Server is running on port 3000", todo esta bien.
echo NO CIERRES ESTA VENTANA.

node dist/index.js
pause

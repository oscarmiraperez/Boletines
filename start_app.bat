@echo off
echo Iniciando GRAVITY...

:: Iniciar Backend en una nueva ventana
start "GRAVITY Backend" cmd /k "cd backend && npm run dev"

:: Esperar un poco para que el backend arranque
timeout /t 5

:: Iniciar Frontend en una nueva ventana
start "GRAVITY Frontend" cmd /k "cd frontend && npm run dev"

:: Esperar a que vite arranque y abrir navegador
timeout /t 5
start http://localhost:5173

echo.
echo Todo listo! No cierres las ventanas negras que se han abierto.
echo.
pause

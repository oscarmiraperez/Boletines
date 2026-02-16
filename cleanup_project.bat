@echo off
echo Limpiando proyecto para subir a GitHub...
echo.

echo Borrando node_modules del root...
if exist node_modules rmdir /s /q node_modules

echo Borrando node_modules del backend...
if exist backend\node_modules rmdir /s /q backend\node_modules
if exist backend\dist rmdir /s /q backend\dist
if exist backend\temp_output rmdir /s /q backend\temp_output
if exist backend\test_output rmdir /s /q backend\test_output

echo Borrando node_modules del frontend...
if exist frontend\node_modules rmdir /s /q frontend\node_modules
if exist frontend\dist rmdir /s /q frontend\dist

echo.
echo Limpieza completada!
echo Ahora puedes inicializar tu repositorio git:
echo 1. git init
echo 2. git add .
echo 3. git commit -m "Initial commit"
echo 4. git remote add origin <tu-repositorio-url>
echo 5. git push -u origin main
echo.
pause

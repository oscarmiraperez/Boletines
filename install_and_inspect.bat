@echo off
cd backend
call npm install pdf-lib
if %errorlevel% neq 0 exit /b %errorlevel%
echo pdf-lib installed successfully
call npx ts-node src/inspect_pdf.ts
pause

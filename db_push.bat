@echo off
cd backend
call npx prisma db push
pause

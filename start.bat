@echo off
echo Starting VoucherFlow...

start "VoucherFlow Server" cmd /k "cd /d D:\VoucherFlow\server && npm run dev"
timeout /t 2 /nobreak >nul
start "VoucherFlow Client" cmd /k "cd /d D:\VoucherFlow\client && npm run dev"

echo Both windows launched.

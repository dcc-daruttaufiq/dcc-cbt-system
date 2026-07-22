@echo off
echo ===================================
echo   AUTOMATIC GIT PUSH DCC-CBT
echo ===================================
git add .
set /p commit_msg="Masukkan pesan commit (bebas/langsung enter): "
if "%commit_msg%"=="" set commit_msg="update: sync bank soal & peserta real"
git commit -m "%commit_msg%"
git push origin main
echo ===================================
echo   PUSH SELESAI! APLIKASI TELAH DISINKRONKAN
echo ===================================
pause
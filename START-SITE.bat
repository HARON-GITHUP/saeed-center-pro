@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Saeed Center Pro

where node >nul 2>&1
if errorlevel 1 (
  echo [خطأ] يجب تثبيت Node.js 22 أو أحدث لتشغيل النظام.
  echo هذا المشروع Full-Stack ولا يعمل عبر Live Server أو بفتح index.html مباشرة.
  pause
  exit /b 1
)

node -e "if(parseInt(process.versions.node.split('.')[0])<22) process.exit(1)"
if errorlevel 1 (
  echo [خطأ] إصدار Node.js قديم. استخدم Node.js 22 أو أحدث.
  node -v
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Saeed Education Center Pro
echo ========================================
echo.
echo سيتم فحص المنفذ وتشغيل السيرفر الصحيح تلقائيا.
echo لا تستخدم Go Live / Live Server لهذا المشروع.
echo.
node start-local.js
pause

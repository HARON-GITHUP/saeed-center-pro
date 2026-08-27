@echo off
chcp 65001 >nul
setlocal
color 0B
cls
echo ===============================================
echo   ترحيل بيانات النسخة السابقة - سنتر سعيد
echo ===============================================
echo.
echo مهم: اغلق START-SITE.bat واي نافذة Node للنسخة القديمة اولا.
echo هذه الاداة لا تحذف مجلد النسخة القديمة.
echo.
set /p OLD=اكتب مسار مجلد النسخة القديمة ثم Enter: 
set OLD=%OLD:"=%
if not exist "%OLD%\data\saeed-center.db" (
  echo.
  echo لم يتم العثور على قاعدة البيانات في:
  echo %OLD%\data\saeed-center.db
  echo.
  pause
  exit /b 1
)
if not exist "data" mkdir "data"
if not exist "backup-before-migration" mkdir "backup-before-migration"
if exist "data\saeed-center.db" copy /Y "data\saeed-center.db" "backup-before-migration\saeed-center.db" >nul
if exist "data\saeed-center.db-wal" copy /Y "data\saeed-center.db-wal" "backup-before-migration\saeed-center.db-wal" >nul
if exist "data\saeed-center.db-shm" copy /Y "data\saeed-center.db-shm" "backup-before-migration\saeed-center.db-shm" >nul
copy /Y "%OLD%\data\saeed-center.db*" "data\" >nul
if exist "%OLD%\uploads" (
  if not exist "uploads" mkdir "uploads"
  xcopy "%OLD%\uploads\*" "uploads\" /E /I /Y /Q >nul
)
echo.
echo تم نسخ قاعدة البيانات والملفات القديمة بنجاح.
echo شغل START-SITE.bat الآن؛ النظام سيضيف الجداول الجديدة تلقائيا بدون حذف البيانات القديمة.
echo.
pause

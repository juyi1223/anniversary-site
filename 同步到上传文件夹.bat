@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "TARGET=%USERPROFILE%\Desktop\上传文件"

if not exist "%TARGET%" mkdir "%TARGET%"
if not exist "%TARGET%\assets" mkdir "%TARGET%\assets"

copy /y "index.html" "%TARGET%\" >nul
copy /y "anniversary.html" "%TARGET%\" >nul
copy /y "anniversary.js" "%TARGET%\" >nul
copy /y "app.js" "%TARGET%\" >nul
copy /y "cloud-config.js" "%TARGET%\" >nul
copy /y "cloud.js" "%TARGET%\" >nul
copy /y "food.html" "%TARGET%\" >nul
copy /y "food.js" "%TARGET%\" >nul
copy /y "home.js" "%TARGET%\" >nul
copy /y "styles.css" "%TARGET%\" >nul
copy /y "world.html" "%TARGET%\" >nul
copy /y "world.js" "%TARGET%\" >nul

robocopy "assets" "%TARGET%\assets" /MIR >nul

echo 已更新桌面“上传文件”文件夹。
echo 你上传 GitHub 时，只拖这个文件夹里面的内容即可。
pause

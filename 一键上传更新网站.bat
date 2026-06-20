@echo off
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
  echo 未检测到 Git，请先安装 Git for Windows。
  pause
  exit /b 1
)

if exist ".git" (
  git status >nul 2>nul
  if errorlevel 1 (
    rmdir /s /q ".git"
  )
)

git status >nul 2>nul
if errorlevel 1 (
  git init
  git branch -M main
)

git remote get-url origin >nul 2>nul
if errorlevel 1 (
  git remote add origin https://github.com/juyi1223/anniversary-site.git
) else (
  git remote set-url origin https://github.com/juyi1223/anniversary-site.git
)

git add assets anniversary.html anniversary.js app.js cloud-config.js cloud.js food.html food.js home.js index.html styles.css world.html world.js .gitignore
git diff --cached --quiet
if not errorlevel 1 (
  echo 没有检测到需要上传的改动。
  pause
  exit /b 0
)

for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set today=%%a-%%b-%%c
set now=%time::=-%
git commit -m "Update website %today% %now%"
git push -u origin main

if errorlevel 1 (
  echo.
  echo 上传失败。请确认你已经登录 GitHub，并且这个账号有 anniversary-site 仓库权限。
  echo 如果弹出 GitHub 登录窗口，请登录后再双击运行一次。
  pause
  exit /b 1
)

echo.
echo 上传完成。GitHub Pages 通常 1-3 分钟后更新。
pause

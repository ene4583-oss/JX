@echo off
chcp 65001 >nul
cd /d "%~dp0backend"
where node >nul 2>nul
if errorlevel 1 (
 echo 请先安装 Node.js LTS，然后重新双击这个文件。
 echo 官方下载：https://nodejs.org/
 pause
 exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 (
 echo Node.js 版本太旧，请安装最新 LTS 版本再试。
 pause
 exit /b 1
)
if not exist node_modules\.jianxu-installed (
 echo 首次启动，正在安装依赖，请稍候……
 call npm ci --omit=dev
 if errorlevel 1 (
  echo 依赖安装失败，请检查网络后重试。
  pause
  exit /b 1
 )
 echo installed>node_modules\.jianxu-installed
)
call npm start
pause

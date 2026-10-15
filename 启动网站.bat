@echo off
setlocal
chcp 65001 >nul
set "JX_EXIT_CODE=1"
cd /d "%~dp0backend"
if errorlevel 1 goto missing_files
if not exist "package.json" goto missing_files
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 22 ? 0 : 1)"
if errorlevel 1 goto old_node
if exist "node_modules\.jianxu-installed" goto start_server
echo Installing dependencies. Please wait...
call npm.cmd ci --omit=dev
if errorlevel 1 goto install_failed
if not exist "node_modules" mkdir "node_modules"
>"node_modules\.jianxu-installed" echo installed
:start_server
echo Starting Jian Xu. Keep this window open.
call npm.cmd start
set "JX_EXIT_CODE=%ERRORLEVEL%"
goto finish
:missing_files
echo Cannot find backend files. Extract the entire ZIP before starting.
goto finish
:missing_node
echo Please install Node.js LTS, then run this file again.
echo Download: https://nodejs.org/
goto finish
:old_node
echo Node.js is too old. Install Node.js LTS version 22 or newer.
goto finish
:install_failed
echo Dependency installation failed. Check your internet connection and retry.
goto finish
:finish
if not defined JX_NO_PAUSE pause
exit /b %JX_EXIT_CODE%

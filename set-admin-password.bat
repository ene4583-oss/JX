@echo off
setlocal
chcp 65001 >nul
set "JX_EXIT_CODE=1"
cd /d "%~dp0backend"
if errorlevel 1 goto missing_files
if not exist "tools\set-admin-password.js" goto missing_files
where node >nul 2>nul
if errorlevel 1 goto missing_node
if not exist "node_modules\bcryptjs" goto missing_dependencies
node tools\set-admin-password.js
set "JX_EXIT_CODE=%ERRORLEVEL%"
goto finish
:missing_files
echo Please extract the entire latest JX ZIP before running this file.
goto finish
:missing_node
echo Install Node.js LTS from https://nodejs.org/ and retry.
goto finish
:missing_dependencies
echo Run start-windows.bat once to install dependencies and set up MySQL.
goto finish
:finish
if not defined JX_NO_PAUSE pause
exit /b %JX_EXIT_CODE%

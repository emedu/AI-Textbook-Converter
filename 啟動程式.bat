@echo off
setlocal
echo ===========================================
echo   AI Textbook Converter - Starting...
echo ===========================================

REM 設定當前目錄
cd /d "%~dp0"

REM 設定工具路徑
set "NODE_PATH=%~dp0tools\node"
set "PANDOC_PATH=%~dp0tools\pandoc"

REM 將工具加入環境變數
set "PATH=%NODE_PATH%;%PANDOC_PATH%;%PATH%"

REM ----------------------------------
REM 1. 檢查 Node
REM ----------------------------------
echo [Check] Node.js version:
node -v
if errorlevel 1 goto ErrorNode

REM ----------------------------------
REM 2. 檢查 Pandoc
REM ----------------------------------
echo [Check] Pandoc version:
pandoc -v
if errorlevel 1 goto ErrorPandoc

REM ----------------------------------
REM 3. 檢查並安裝套件
REM ----------------------------------
if exist "node_modules" goto StartServer

echo.
echo [Info] Target folder 'node_modules' not found.
echo [Info] Installing dependencies (First run only)...
echo This may take a few minutes...
call npm install
if errorlevel 1 goto ErrorInstall

:StartServer
echo.
echo ===========================================
echo   Starting Server...
echo ===========================================
echo.

REM 先開啟瀏覽器
start "" "http://localhost:3000"

REM 啟動伺服器
node src/server.js
pause
exit /b

:ErrorNode
echo.
echo [Error] Node.js not found!
echo Please check 'tools/node' folder.
pause
exit /b

:ErrorPandoc
echo.
echo [Error] Pandoc not found!
echo Please check 'tools/pandoc' folder.
pause
exit /b

:ErrorInstall
echo.
echo [Error] Installation failed!
echo Please check your internet connection.
pause
exit /b

@echo off
echo ========================================
echo   AI 教材轉換系統 - 啟動中...
echo ========================================
echo.

REM 檢查 Node.js 是否安裝
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [錯誤] 找不到 Node.js!
    echo 請先安裝 Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [✓] Node.js 已安裝
echo.

REM 檢查是否已安裝套件
if not exist "node_modules\" (
    echo [!] 第一次使用,正在安裝必要套件...
    echo 這可能需要 3-5 分鐘,請耐心等候
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [錯誤] 套件安裝失敗!
        pause
        exit /b 1
    )
    echo.
    echo [✓] 套件安裝完成!
    echo.
)

echo [✓] 正在啟動伺服器...
echo.
echo ========================================
echo   程式已啟動!
echo   請在瀏覽器中開啟: http://localhost:3000
echo   按 Ctrl+C 可以關閉程式
echo ========================================
echo.

REM 啟動伺服器
node src/server.js

pause

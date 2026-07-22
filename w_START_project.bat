@echo off
chcp 65001 >nul
echo Перезапуск проекта ТФХ...

:: Убиваем процессы Node.js
echo Останавливаем старые серверы...
taskkill /F /IM node.exe /T >nul 2>&1

:: Даем секунду на освобождение портов
timeout /t 1 /nobreak >nul

:: Запускаем бэкенд (без паузы в конце)
echo Запускаем бэкенд...
start "TFH Backend" cmd /c "cd TFH-Backend && npm run dev"

:: Запускаем фронтенд (без паузы в конце)
echo Запускаем фронтенд...
start "TFH Frontend" cmd /c "cd TFH-Frontend && npm run dev"

echo Все процессы успешно перезапущены!
timeout /t 2 >nul
exit

# Используем легковесный образ Node.js
FROM node:20-slim

# Переключаем зеркала Debian на Яндекс (чтобы избежать зависаний сети)
RUN sed -i 's/deb.debian.org/mirror.yandex.ru/g' /etc/apt/sources.list.d/debian.sources || true

# Создаем рабочую папку
WORKDIR /app

# Сначала копируем только файлы зависимостей
COPY package*.json ./

# Ретраи на сетевые обрывы (нестабильность сети Timeweb иногда роняет npm install
# с "Exit handler never called!"). После установки — жёсткая проверка, что express
# реально резолвится: без неё npm иногда возвращает успешный код выхода даже после
# сбоя, и битый node_modules молча уезжает в прод.
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install && \
    node -e "require.resolve('express')"

# Копируем весь остальной код бэкенда
COPY . .

# Открываем порт
EXPOSE 3003

# Запускаем сервер
CMD ["node", "server.js"]

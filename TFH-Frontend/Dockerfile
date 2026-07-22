# === ЭТАП 1: Сборка проекта ===
FROM node:20-slim AS builder

# Встраиваем "костыль" для обхода зависаний сети Timeweb
RUN sed -i 's/deb.debian.org/mirror.yandex.ru/g' /etc/apt/sources.list.d/debian.sources || true
RUN apt-get update -o Acquire::ForceIPv4=true && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем файлы зависимостей и устанавливаем их
COPY package*.json ./

# Ретраи на сетевые обрывы (нестабильность сети Timeweb может уронить npm install на скачивании пакетов)
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install

# Копируем весь остальной код и запускаем сборку
COPY . .
RUN npm run build

# === ЭТАП 2: Раздача статики через Nginx ===
FROM nginx:alpine

# Удаляем дефолтную страницу Nginx
RUN rm -rf /usr/share/nginx/html/*

# Копируем готовую сборку из первого этапа
COPY --from=builder /app/dist /usr/share/nginx/html

# Прокидываем 80 порт
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]

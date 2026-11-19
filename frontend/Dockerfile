# syntax=docker/dockerfile:1.7
# EniForum — Frontend Angular servi par Nginx (non-root, port 8080)

# 1. Build Angular
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY angular.json tsconfig*.json ./
COPY src ./src
RUN npx ng build --configuration production

# 2. Serveur web
FROM nginxinc/nginx-unprivileged:1.27-alpine
LABEL org.opencontainers.image.title="eniforum-frontend" \
      org.opencontainers.image.description="Interface web Angular de la plateforme EniForum" \
      org.opencontainers.image.source="https://github.com/fatmaBouajla/eniforum"

# Adresse de l'API, remplacée au démarrage dans la configuration Nginx
ENV BACKEND_URL=http://backend:8081
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/forum-enicarthage-app/browser /usr/share/nginx/html
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://localhost:8080/ || exit 1

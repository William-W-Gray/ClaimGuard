# ─── ClaimGuard Web — build the SPA, serve with nginx ──────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Kept outside conf.d/ so nginx's `include conf.d/*.conf` doesn't load it as a
# standalone config; it's pulled into each location via an explicit include.
COPY security-headers.conf /etc/nginx/security-headers.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

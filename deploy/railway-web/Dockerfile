# Multi-stage: build Expo Web static export, serve with nginx.
# Railway: set root directory to repo root, Dockerfile path deploy/railway-web/Dockerfile

FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
ENV EXPO_PUBLIC_SUPABASE_URL=https://api.hockey-stars.com

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine

COPY deploy/railway-web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

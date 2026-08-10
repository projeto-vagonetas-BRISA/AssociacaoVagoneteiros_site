# Frontend

FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

RUN npm run build


# Backend

FROM node:22-alpine AS backend-build

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./

RUN npx prisma generate
RUN npm run build
RUN npx tsc -p tsconfig.seed.json


# Produção

FROM node:22-alpine AS production

WORKDIR /app/backend

ENV NODE_ENV=production

COPY --from=backend-build /app/backend/package*.json ./
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/dist-seed ./dist-seed

COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 3000

CMD ["node", "dist/server.js"]
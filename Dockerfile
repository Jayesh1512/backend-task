FROM node:18-alpine AS builder
WORKDIR /app

COPY .env.example package.json package-lock.json* tsconfig.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/views ./views
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD [ "node", "dist/index.js" ]

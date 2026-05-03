FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npx nx build api --prod

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/apps/api ./dist
COPY --from=deps    /app/node_modules  ./node_modules
EXPOSE 3001
CMD ["node", "dist/main.js"]

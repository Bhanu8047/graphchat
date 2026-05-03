FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npx nx build web --prod

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist/apps/web/.next/standalone  ./
COPY --from=builder /app/dist/apps/web/public            ./public
COPY --from=builder /app/dist/apps/web/.next/static      ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

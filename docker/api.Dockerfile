FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run api:build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
RUN rm -rf node_modules/@vectorgraph && \
    mkdir -p node_modules/@vectorgraph/ai node_modules/@vectorgraph/shared-types node_modules/@vectorgraph/vector-client
COPY --from=builder /app/dist/apps/api/apps/api/src ./dist/apps/api/src
COPY --from=builder /app/dist/apps/api/libs/ai/src ./node_modules/@vectorgraph/ai/src
COPY --from=builder /app/dist/apps/api/libs/shared-types/src ./node_modules/@vectorgraph/shared-types/src
COPY --from=builder /app/dist/apps/api/libs/vector-client/src ./node_modules/@vectorgraph/vector-client/src
RUN printf '{"main":"src/index.js"}\n' > node_modules/@vectorgraph/ai/package.json && \
    printf '{"main":"src/index.js"}\n' > node_modules/@vectorgraph/shared-types/package.json && \
    printf '{"main":"src/index.js"}\n' > node_modules/@vectorgraph/vector-client/package.json
EXPOSE 3001
CMD ["node", "dist/apps/api/src/main.js"]

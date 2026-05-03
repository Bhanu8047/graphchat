FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/ai/package.json ./libs/ai/
COPY libs/shared-types/package.json ./libs/shared-types/
COPY libs/vector-client/package.json ./libs/vector-client/
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
# Build all workspace libs then webpack-bundle the API
RUN npm exec nx build api

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Bring in production node_modules (excluding the monorepo symlinks)
COPY --from=deps /app/node_modules ./node_modules
RUN rm -rf node_modules/@vectorgraph

# The webpack bundle
COPY --from=builder /app/apps/api/dist/main.js ./dist/main.js

# Compiled @vectorgraph workspace libs (required by the bundle at runtime)
COPY --from=builder /app/libs/shared-types/dist ./node_modules/@vectorgraph/shared-types/dist
COPY --from=builder /app/libs/shared-types/package.json ./node_modules/@vectorgraph/shared-types/package.json
COPY --from=builder /app/libs/vector-client/dist ./node_modules/@vectorgraph/vector-client/dist
COPY --from=builder /app/libs/vector-client/package.json ./node_modules/@vectorgraph/vector-client/package.json
COPY --from=builder /app/libs/ai/dist ./node_modules/@vectorgraph/ai/dist
COPY --from=builder /app/libs/ai/package.json ./node_modules/@vectorgraph/ai/package.json

EXPOSE 3001
CMD ["node", "dist/main.js"]

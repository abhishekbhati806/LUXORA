# Build the SPA, then run one small image: Express serves /api/v1 and client/dist.
#   docker build -t luxora .
#   docker run -p 4000:4000 --env-file .env luxora

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    SERVE_CLIENT=true
WORKDIR /app

# install server/prod deps first for layer caching
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /app/uploads && chown -R node:node /app
USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/v1/health >/dev/null 2>&1 || exit 1

CMD ["node", "server/src/index.js"]

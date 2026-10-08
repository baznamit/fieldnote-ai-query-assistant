FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install --global bun@1.3.3 && bun install --frozen-lockfile
COPY backend ./backend
COPY src/lib ./src/lib
RUN bun build backend/server.ts --target=node --packages=bundle --outfile=dist/server.mjs

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=builder --chown=node:node /app/dist/server.mjs ./server.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]

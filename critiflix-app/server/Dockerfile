# CritiFlix API — build context must be the repo root (critiflix-app/) so that
# both server/ and admin/ are available. On Render set:
#   Root Directory = critiflix-app   ·   Dockerfile Path = ./server/Dockerfile
FROM node:20-alpine
WORKDIR /app/server

# Install deps first for better layer caching
COPY server/package.json ./
RUN npm install --omit=dev

# App source + admin console (served at /admin from ../../admin)
COPY server/ ./
COPY admin/ /app/admin/

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Optionally seed an admin on first boot (only when the DB is empty), then start.
# No separate entrypoint script — avoids the "docker-entrypoint.sh not found" build error.
CMD ["sh","-c","if [ \"$SEED_ON_START\" = \"true\" ]; then node src/scripts/seed-if-empty.js || true; fi; node src/index.js"]

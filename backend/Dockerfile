# Production image for the API.
# Debian-based image: Prisma engines need glibc + openssl 3 (Alpine/musl is unsupported).
# DevDependencies are kept so `prisma migrate deploy` and `tsx prisma/seed.ts`
# can run at container start (see scripts/entrypoint.sh).
FROM node:20-slim

WORKDIR /app

# Prisma engine detection needs the openssl CLI (bookworm-slim omits it).
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

RUN mkdir -p uploads models

EXPOSE 3000
CMD ["sh", "scripts/entrypoint.sh"]

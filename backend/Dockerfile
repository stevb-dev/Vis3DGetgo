# Production image for the API.
# Debian-based image: Prisma engines need glibc + openssl 3 (Alpine/musl is unsupported).
# DevDependencies are kept so `prisma migrate deploy` and `tsx prisma/seed.ts`
# can run at container start (see scripts/entrypoint.sh).

# ── Stage 1: download the ONNX embedding model (build-time internet) ─────────
# The runtime image has no network — the model is baked in at build, keeping the
# "no internet after setup" thesis line. Only the quantized weights are kept.
FROM node:20-slim AS model
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /model
RUN set -eux; \
    BASE="https://huggingface.co/Xenova/multilingual-e5-small/resolve/main"; \
    mkdir -p onnx; \
    for f in config.json tokenizer.json tokenizer_config.json special_tokens_map.json sentencepiece.bpe.model quant_config.json; do \
      curl -fsSL "$BASE/$f" -o "$f"; \
    done; \
    curl -fsSL "$BASE/onnx/model_quantized.onnx" -o "onnx/model_quantized.onnx"

# ── Stage 2: production API image ────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Prisma engine detection needs the openssl CLI (bookworm-slim omits it);
# libgomp1 is the OpenMP runtime onnxruntime-node links against.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl libgomp1 \
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

# Baked-in embedding model (loaded via env.localModelPath).
COPY --from=model /model /app/models/embedding/Xenova/multilingual-e5-small

EXPOSE 3000
CMD ["sh", "scripts/entrypoint.sh"]

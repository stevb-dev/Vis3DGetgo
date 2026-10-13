# 02: Embedding service + model baked into the image

Status: ready-for-agent
Feature: search

## Context

In-process `@huggingface/transformers` (ONNX) runs `Xenova/multilingual-e5-small` (384-dim). The weights must be baked into the backend Docker image at build so an on-premise deploy needs no internet (thesis line: "no internet after initial setup").

## Requirements

- [ ] Add `@huggingface/transformers` to the backend dependencies.
- [ ] `backend/src/lib/embedding.ts`: a lazy singleton that loads the pipeline once (feature-extraction) and memoizes it.
- [ ] Expose `embedPassage(text)` (prefix `passage: `) and `embedQuery(text)` (prefix `query: `); both return a normalized 384-dim `number[]`.
- [ ] Configure `env.allowRemoteModels = false` and `env.localModelPath` to the baked-in directory; fail fast with a clear error if the model is missing (don't silently hit the network).
- [ ] Bake the ONNX model into the backend image at build (download the `Xenova/multilingual-e5-small` repo snapshot/weights in a Dockerfile build stage); verify a clean `docker compose up --build` works with no runtime download.
- [ ] Warm the model at API startup so the first search isn't hit with a multi-second cold start.

## Notes

- Package is `@huggingface/transformers` (the maintained successor to `@xenova/transformers`).
- The `query:`/`passage:` prefix convention is mandatory for e5 — without it results degrade.
- Keep the model out of git (gitignore); it lives in the image build cache, not the repo.

## Comments

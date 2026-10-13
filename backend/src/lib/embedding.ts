import { pipeline, env, type FeatureExtractionPipeline } from '@huggingface/transformers'

// e5-style models require a task prefix so the same model can distinguish
// queries from passages — without it results degrade (see .scratch/search).
const MODEL_ID = 'Xenova/multilingual-e5-small'

// The ONNX model is baked into the image at build time (Dockerfile "model"
// stage). The runtime has no network and must load it from the filesystem —
// this keeps the "no internet after setup" thesis line.
env.allowRemoteModels = false
env.localModelPath = process.env.MODEL_PATH ?? '/app/models/embedding'

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // Quantized (q8) weights are baked in — smaller than fp32 and the default
    // for embeddings; pass the dtype explicitly so transformers.js resolves
    // model_quantized.onnx rather than the fp32 model.onnx.
    extractorPromise = pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' })
  }
  return extractorPromise
}

async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

/** Embed a location's `name. description` as a passage. */
export function embedPassage(nameDescription: string): Promise<number[]> {
  return embed(`passage: ${nameDescription}`)
}

/** The passage text for a location (name + description), per the search spec. */
export function locationText(name: string, description: string | null): string {
  return `${name}. ${description ?? ''}`.trim()
}

/** Embed a user's search query. */
export function embedQuery(query: string): Promise<number[]> {
  return embed(`query: ${query}`)
}

/** Warm the model at startup so the first search isn't hit with cold-start latency. */
export async function warmEmbeddingModel(): Promise<void> {
  await getExtractor()
}

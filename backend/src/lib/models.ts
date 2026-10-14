import multer from 'multer'
import { config } from './config'

/**
 * Model file formats the viewer understands: GLB (Draco-compressed mesh,
 * rendered via @react-three/fiber) and SPZ (3D Gaussian splats). Stored on the
 * Model row so the frontend branches on a typed value rather than parsing the
 * filePath extension.
 */
export const MODEL_FORMATS = ['GLB', 'SPZ'] as const
export type ModelFormat = (typeof MODEL_FORMATS)[number]

export const ALLOWED_MODEL_EXTENSIONS = ['glb', 'spz'] as const

/**
 * Map a filename to its ModelFormat from its extension (case-insensitive).
 * Returns null when the extension is missing or unrecognized.
 */
export function modelFormatFromFilename(filename: string): ModelFormat | null {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0) return null // no extension (or a lone leading dot)
  const ext = filename.slice(dot + 1).toLowerCase()
  if (ext === 'glb') return 'GLB'
  if (ext === 'spz') return 'SPZ'
  return null
}

/**
 * Multer file filter — accept only .glb / .spz. The extension (not the client's
 * mimetype) is the source of truth: GLB arrives as model/gltf-binary and SPZ as
 * application/octet-stream, so mimetypes are unreliable here.
 */
function modelFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (modelFormatFromFilename(file.originalname)) {
    cb(null, true)
  } else {
    cb(new Error('Unsupported file type. Allowed extensions: .glb, .spz'))
  }
}

/**
 * Single-file upload pipeline (memory storage — admin-only and low-concurrency,
 * so a 50 MB worst-case RAM footprint is fine on-premise). The server
 * regenerates the on-disk name (<uuid>.<ext>), so a client filename can never
 * path-traverse into the models volume.
 */
export const uploadModel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxModelMb * 1024 * 1024, files: 1 },
  fileFilter: modelFileFilter,
}).single('file')

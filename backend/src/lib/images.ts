import multer from 'multer'
import sharp from 'sharp'
import { config } from './config'

export const MAX_FILES_PER_UPLOAD = 10

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/**
 * Multer file filter — the only accepted uploads are JPEG/PNG/WebP.
 * Returning an error aborts the WHOLE request (all-or-nothing batch, see
 * .scratch/images/issues/01): one bad file rejects the entire drop.
 */
export function imageFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP.`))
  }
}

/**
 * Multer pipeline: memory storage (sharp needs the bytes anyway; 10 × MAX_UPLOAD_MB
 * is the worst-case RAM footprint, fine at on-premise concurrency).
 */
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadMb * 1024 * 1024, files: MAX_FILES_PER_UPLOAD },
  fileFilter: imageFileFilter,
}).array('images', MAX_FILES_PER_UPLOAD)

export interface ProcessedImage {
  buffer: Buffer
  info: sharp.OutputInfo
}

/**
 * Server-side optimization: auto-orient from EXIF, shrink to at most 1200×800
 * (never enlarge), encode WebP q85. EXIF metadata is not carried into the
 * WebP output — a privacy nicety since photos get published.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const { data, info } = await sharp(input)
    .rotate() // apply EXIF orientation before resizing
    .resize(1200, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true })
  return { buffer: data, info }
}

/**
 * May the uploader designate one file of the batch as the pinned thumbnail?
 * Grilling decision: only the location creator's INITIAL batch — i.e. the
 * location currently has zero images AND the requester is its owner.
 * Admins may always pin (they have the dedicated PATCH endpoint regardless).
 * Any later change to the thumbnail is admin-only.
 */
export function mayPickThumbnailOnUpload(params: {
  imageCount: number
  requesterId: number
  ownerId: number | null
  role: 'USER' | 'ADMIN'
}): boolean {
  if (params.imageCount !== 0) return false
  if (params.role === 'ADMIN') return true
  return params.ownerId === params.requesterId
}

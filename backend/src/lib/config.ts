function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret:
    process.env.NODE_ENV === 'production'
      ? required('JWT_SECRET')
      : (process.env.JWT_SECRET ?? 'dev-only-insecure-secret'),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  modelsDir: process.env.MODELS_DIR ?? 'models',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  maxImagesPerLocation: Number(process.env.MAX_IMAGES_PER_LOCATION ?? 200),
  // 3D model upload budget — .spz Gaussian splats are far larger than GLB meshes.
  maxModelMb: Number(process.env.MAX_MODEL_MB ?? 50),
} as const

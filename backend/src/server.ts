import fs from 'fs'
import path from 'path'
import { createApp } from './app'
import { config } from './lib/config'

// Ensure upload/model directories exist (they are Docker volume mount targets).
fs.mkdirSync(path.resolve(config.uploadDir), { recursive: true })
fs.mkdirSync(path.resolve(config.modelsDir), { recursive: true })

const app = createApp()

app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port} (env: ${process.env.NODE_ENV ?? 'development'})`)
})

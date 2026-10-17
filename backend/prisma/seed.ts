import bcrypt from 'bcrypt'
import fs from 'fs'
import path from 'path'
import { LocationCategory, ModelFormat } from '@prisma/client'
import { prisma } from '../src/lib/prisma'
import { config } from '../src/lib/config'
import { convertSpzToV4, ensureSpzV4, isSpzV4 } from '../src/lib/spz'

interface DemoLocation {
  name: string
  description: string
  latitude: number
  longitude: number
  category: LocationCategory
}

const demoLocations: DemoLocation[] = [
  {
    name: 'Macedonia Square',
    description: 'Central square of Skopje — seed demo location.',
    latitude: 41.9965,
    longitude: 21.4313,
    category: LocationCategory.MONUMENTS,
  },
  {
    name: 'Skopje Fortress (Kale)',
    description: 'Fortress hill above the old bazaar — seed demo location.',
    latitude: 42.0001,
    longitude: 21.4323,
    category: LocationCategory.MONUMENTS,
  },
  {
    name: 'Stone Bridge',
    description: 'Ottoman-era bridge over the Vardar — seed demo location.',
    latitude: 41.9961,
    longitude: 21.4326,
    category: LocationCategory.MONUMENTS,
  },
  {
    name: 'Matka Canyon',
    description: 'Canyon and lake west of Skopje — seed demo location.',
    latitude: 41.9416,
    longitude: 21.3015,
    category: LocationCategory.NATURE,
  },
]

interface DemoModel {
  locationName: string
  filename: string
  format: ModelFormat
}

// Demo 3D models (`.scratch/models-3d/issues/02`). Files live in the bind-mounted
// `backend/models/` dir (out of git); the seed registers the Model rows and reads
// sizes from disk. Kale Fortress is deliberately left without a model so the
// sidebar's "no model" state stays demonstrable.
const demoModels: DemoModel[] = [
  { locationName: 'Macedonia Square', filename: 'marble-bust.glb', format: 'GLB' },
  { locationName: 'Stone Bridge', filename: 'stone-bridge.glb', format: 'GLB' },
  { locationName: 'Matka Canyon', filename: 'racoonfamily.spz', format: 'SPZ' },
]

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'ADMIN' },
    create: {
      email: adminEmail,
      username: 'admin',
      password: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
    },
  })
  console.log(`[seed] admin user ready: ${admin.email}`)

  // Demo persona (grilling decision): the seeded locations belong to a
  // login-able ADMIN 'curator' account — demo@example.com / Demo123!.
  // A USER role would be cosmetic anyway: the attached models block owners.
  const demoEmail = process.env.SEED_DEMO_EMAIL ?? 'demo@example.com'
  const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'Demo123!'

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { role: 'ADMIN' },
    create: {
      email: demoEmail,
      username: 'demo',
      password: await bcrypt.hash(demoPassword, 12),
      role: 'ADMIN',
    },
  })
  console.log(`[seed] demo user ready: ${demo.email}`)

  for (const loc of demoLocations) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } })
    if (existing) {
      if (!existing.seeded || existing.userId !== demo.id || existing.category !== loc.category) {
        await prisma.location.update({
          where: { id: existing.id },
          data: { seeded: true, userId: demo.id, category: loc.category },
        })
        console.log(`[seed] adopted location: ${loc.name}`)
      }
      continue
    }
    await prisma.location.create({ data: { ...loc, seeded: true, userId: demo.id } })
    console.log(`[seed] created location: ${loc.name}`)
  }

  // The seed script owns the demo dataset (rows flagged seeded = true).
  // Prune stale demo rows so the map matches this file.
  const demoNames = demoLocations.map((loc) => loc.name)
  const pruned = await prisma.location.deleteMany({
    where: { seeded: true, name: { notIn: demoNames } },
  })
  if (pruned.count > 0) {
    console.log(`[seed] pruned ${pruned.count} stale demo location(s)`)
  }

  // ── Demo 3D models (`.scratch/models-3d/issues/02`) ────────────────────────
  // Upsert the demo models, then prune any model on a seeded location that is no
  // longer in the list — mirroring the location pruning above. A missing file is
  // skipped (fresh clone without `backend/models/` still boots cleanly).
  const modelFiles = demoModels.map((m) => m.filename)
  for (const m of demoModels) {
    const location = await prisma.location.findFirst({
      where: { name: m.locationName, seeded: true },
    })
    if (!location) continue

    const filePath = `/models/${m.filename}`
    const fullPath = path.join(config.modelsDir, m.filename)

    // Read once. Legacy (v1–3) .spz demo files are converted to v4 in place —
    // the PlayCanvas SPZ parser reads only v4 (grilling 2026-10-17). The
    // conversion is idempotent; a missing or corrupt file skips the model.
    let data: Buffer
    try {
      data = await fs.promises.readFile(fullPath)
    } catch {
      console.log(`[seed] model file missing (skipped): ${m.filename}`)
      continue
    }
    if (m.format === 'SPZ') {
      const wasV4 = isSpzV4(data)
      try {
        data = await ensureSpzV4(data, fullPath)
      } catch (err) {
        console.warn(`[seed] could not convert demo model (skipped): ${m.filename} —`, err)
        continue
      }
      if (!wasV4) console.log(`[seed] converted demo model to SPZ v4: ${m.filename}`)
    }

    const existing = await prisma.model.findUnique({ where: { locationId: location.id } })
    if (existing) {
      if (
        existing.filename !== m.filename ||
        existing.format !== m.format ||
        existing.fileSize !== data.length ||
        !existing.seeded
      ) {
        await prisma.model.update({
          where: { id: existing.id },
          data: { filename: m.filename, filePath, fileSize: data.length, format: m.format, seeded: true },
        })
        console.log(`[seed] updated model: ${m.filename}`)
      }
      continue
    }
    await prisma.model.create({
      data: {
        locationId: location.id,
        filename: m.filename,
        filePath,
        fileSize: data.length,
        format: m.format,
        seeded: true,
      },
    })
    console.log(`[seed] created model: ${m.filename}`)
  }

  // Prune only the seed's OWN models (seeded = true) — an admin upload on a
  // seeded location survives re-seeding.
  const seededIds = (
    await prisma.location.findMany({ where: { seeded: true }, select: { id: true } })
  ).map((l) => l.id)
  const staleModels = await prisma.model.findMany({
    where: { seeded: true, locationId: { in: seededIds }, filename: { notIn: modelFiles } },
    select: { id: true, filename: true },
  })
  for (const m of staleModels) {
    await prisma.model.delete({ where: { id: m.id } })
    await fs.promises.rm(path.join(config.modelsDir, m.filename), { force: true }).catch(() => undefined)
    console.log(`[seed] pruned stale model: ${m.filename}`)
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })

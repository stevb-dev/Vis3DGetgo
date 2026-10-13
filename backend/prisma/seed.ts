import bcrypt from 'bcrypt'
import { LocationCategory } from '@prisma/client'
import { prisma } from '../src/lib/prisma'

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
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
  })

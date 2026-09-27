import bcrypt from 'bcrypt'
import { prisma } from '../src/lib/prisma'

const demoLocations = [
  {
    name: 'Macedonia Square',
    description: 'Central square of Skopje — seed demo location.',
    latitude: 41.9965,
    longitude: 21.4313,
  },
  {
    name: 'Skopje Fortress (Kale)',
    description: 'Fortress hill above the old bazaar — seed demo location.',
    latitude: 42.0001,
    longitude: 21.4323,
  },
  {
    name: 'Stone Bridge',
    description: 'Ottoman-era bridge over the Vardar — seed demo location.',
    latitude: 41.9961,
    longitude: 21.4326,
  },
  {
    name: 'Matka Canyon',
    description: 'Canyon and lake west of Skopje — seed demo location.',
    latitude: 41.9416,
    longitude: 21.3015,
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

  for (const loc of demoLocations) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } })
    if (existing) continue
    await prisma.location.create({ data: loc })
    console.log(`[seed] created location: ${loc.name}`)
  }

  // The seed script owns the demo dataset (locations with userId = null).
  // Prune stale demo rows so the map matches this file.
  const demoNames = demoLocations.map((loc) => loc.name)
  const pruned = await prisma.location.deleteMany({
    where: { userId: null, name: { notIn: demoNames } },
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

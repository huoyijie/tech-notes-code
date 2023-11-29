import { PrismaClient } from '@prisma/client'
import { hashPassword, sha256 } from '../src/util.js'
import dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  switch (nodeEnv) {
    case 'production':
      break
    case 'test':
      break
    case 'development':
      // add apps
      await prisma.app.upsert({
        where: { id: 1 },
        update: {},
        create: {
          id: 1,
          name: 'admin.dev',
          secret: sha256('123456'),
        },
      })
      await prisma.app.upsert({
        where: { id: 2 },
        update: {},
        create: {
          id: 2,
          name: 'huoyijie.cn',
          secret: sha256('654321'),
        },
      })

      // add super user
      await prisma.employee.upsert({
        where: { email: 'huoyijie@huoyijie.cn' },
        update: {},
        create: {
          email: 'huoyijie@huoyijie.cn',
          password: await hashPassword('12345678'),
          phone: '13323232214',
        },
      })
      break
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
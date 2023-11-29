import { PrismaClient } from '@prisma/client'
import { parseArgs } from 'node:util'
import { hashPassword, sha256 } from '../src/util.js'

const prisma = new PrismaClient()
const options = {
  environment: { type: 'string' },
}

async function main() {
  const {
    values: { environment },
  } = parseArgs({ options })

  switch (environment) {
    case 'production':
      break
    case 'test':
      break
    case 'development':
    default:
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
import env from '../src/env.js'
import prisma from '../src/db.js'
import util from '../src/util.js'

async function main() {
  switch (env.nodeEnv) {
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
          secret: util.sha256('123456'),
        },
      })
      await prisma.app.upsert({
        where: { id: 2 },
        update: {},
        create: {
          id: 2,
          name: 'huoyijie.cn',
          secret: util.sha256('654321'),
        },
      })

      // add super user
      await prisma.employee.upsert({
        where: { email: 'huoyijie@huoyijie.cn' },
        update: {},
        create: {
          email: 'huoyijie@huoyijie.cn',
          password: await util.hashPassword('12345678'),
          phone: '13323232214',
          super: true,
        },
      })

      // add user
      await prisma.user.upsert({
        where: { email: 'huoyijie@huoyijie.cn' },
        update: {},
        create: {
          email: 'huoyijie@huoyijie.cn',
          password: await util.hashPassword('12345678'),
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
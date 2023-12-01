'use strict'

import app from '#app'
import env from '#env'
import prisma from '#db'

async function main() {
  const { log, port } = env

  const logger = log ? {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  } : false
  const App = app({ logger })

  await App.listen({ port })
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
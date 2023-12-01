import app from '#app'
import env from '#env'
import prisma from '#db'

async function main() {
  const { log: logger, port } = env
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
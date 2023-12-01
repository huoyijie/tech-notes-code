import { PrismaClient } from '@prisma/client'
import env from '#env'

const prisma = new PrismaClient({
  log: env.logSql
})

export default prisma
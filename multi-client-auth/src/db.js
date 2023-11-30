import { PrismaClient } from '@prisma/client'
import env from './env.js'

const prisma = new PrismaClient({
  log: env.logSql
})

export default prisma
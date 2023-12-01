import casbin from 'casbin'
import { PrismaAdapter } from 'casbin-prisma-adapter'
import prisma from '#db'

const adapter = await PrismaAdapter.newAdapter(prisma)
const enforcer = await casbin.newEnforcer('src/rbac_model.conf', adapter)
enforcer.loadPolicy()

export default enforcer
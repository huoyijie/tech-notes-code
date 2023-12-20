import verifyToken from '@/lib/api/middleware/verifyToken'
import handleUncaughtError from '@/lib/api/middleware/handleUncaughtError'
import get from '@/lib/api/middleware/get'

async function orders(req) {
  return { orders: [] }
}

export default handleUncaughtError(verifyToken(get(orders)))
import verifyToken from '@/lib/api/middleware/verifyToken'
import handleUncaughtError from '@/lib/api/middleware/handleUncaughtError'

async function orders(req, res) {
  res.status(200).json({ orders: [] })
}

export default handleUncaughtError(verifyToken(orders))
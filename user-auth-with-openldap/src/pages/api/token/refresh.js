import handleUncaughtError from '@/lib/api/middleware/handleUncaughtError'

async function refresh(req, res) {
  res.status(200).json({ orders: [] })
}

export default handleUncaughtError(refresh)
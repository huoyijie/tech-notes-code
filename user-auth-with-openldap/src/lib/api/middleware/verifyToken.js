import util from '@/lib/api/util'

export default function verifyToken(handler) {
  return async (req, res) => {
    const token = util.getToken(req)

    if (!token) {
      return res.status(401).json({ message: '未授权' })
    }

    try {
      req.user = util.verifyToken(token)
    } catch (error) {
      return res.status(401).json({ message: '未授权' })
    }

    await handler(req, res)
  }
}
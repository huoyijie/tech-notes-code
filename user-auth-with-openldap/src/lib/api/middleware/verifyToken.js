import util from '@/lib/api/util'
import { TokenExpiredError } from 'jsonwebtoken'

export default function verifyToken(handler) {
  return async (req, res) => {
    const token = util.getToken(req)

    if (!token) {
      return res.status(401).json({ statusCode: 401, code: 'Unauthorized', message: '未授权' })
    }

    try {
      req.user = util.verifyToken(token)
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return res.status(401).json({ statusCode: 401, code: 'TokenExpired', message: '未授权' })
      } else {
        return res.status(401).json({ statusCode: 401, code: 'Unauthorized', message: '未授权' })
      }
    }

    await handler(req, res)
  }
}
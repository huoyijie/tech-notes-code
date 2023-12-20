import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const { SECRET_KEY, ACCESS_TOKEN_EXPIRES } = process.env

export default {
  newToken(username) {
    const accessToken = jwt.sign(
      { username },
      SECRET_KEY,
      { expiresIn: ACCESS_TOKEN_EXPIRES })

    const refreshToken = crypto.randomBytes(32).toString('base64url')

    return {
      access_token: accessToken, token_type: 'Bearer',
      expires_in: ACCESS_TOKEN_EXPIRES,
      refresh_token: refreshToken
    }
  },

  getToken(req) {
    const { authorization } = req.headers
    if (authorization) {
      return authorization.replace('Bearer ', '')
    }
  },

  verifyToken(accessToken) {
    return jwt.verify(accessToken, SECRET_KEY)
  },

  verifyMethod(req, method) {
    return req.method.toUpperCase() === method.toUpperCase()
  },

  wrapper(handler, method) {
    return async (req, res) => {
      const data = this.verifyMethod(req, method) ? await handler(req, res) : {
        statusCode: 405,
        code: 'MethodNotAllowed',
        message: '请求方法找不到',
      }

      res.status(data.statusCode || 200).json(data)
    }
  },
}
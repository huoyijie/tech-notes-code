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

  getToken(request) {
    const { authorization } = request.headers
    if (authorization) {
      return authorization.replace('Bearer ', '')
    }
  },

  verifyToken(accessToken) {
    return jwt.verify(accessToken, SECRET_KEY)
  },
}
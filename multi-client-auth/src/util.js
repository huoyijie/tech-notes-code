import crypto from 'crypto'
import bcrypt from 'bcrypt'

export default {
  sha256(input) {
    const hash = crypto.createHash('sha256')
    hash.update(input)
    return hash.digest('base64url')
  },

  hashPassword(plainPassword, saltRounds = 10) {
    return new Promise((resolve, reject) => {
      bcrypt.hash(plainPassword, saltRounds, (err, hashedPassword) => {
        if (err) {
          reject(err)
        } else {
          resolve(hashedPassword)
        }
      })
    })
  },

  comparePasswords(plainPassword, hashedPassword) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(plainPassword, hashedPassword, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }
}
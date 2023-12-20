import ldap from 'ldapjs'
import util from '@/lib/api/util'
import handleUncaughtError from '@/lib/api/middleware/handleUncaughtError'
import post from '@/lib/api/middleware/post'

function bindAsync(client, userDN, password) {
  return new Promise((resolve, reject) => {
    client.bind(userDN, password, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function unbindAsync(client) {
  return new Promise((resolve, reject) => {
    client.unbind((err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function ldapAuthenticate(username, password) {
  const ldapOptions = {
    url: process.env.LDAP_SERVER,
    tlsOptions: {
      rejectUnauthorized: false, // 禁用证书验证
    },
  }

  const userDN = `uid=${username},ou=users,dc=huoyijie,dc=cn`

  const client = ldap.createClient(ldapOptions)

  try {
    await bindAsync(client, userDN, password)
    // Perform other LDAP operations if needed...
    await unbindAsync(client)
    return true
  } catch (err) {
    return false
  }
}

async function grant(req) {
  const { username, password } = req.body

  if (await ldapAuthenticate(username, password)) {
    return util.newToken(username)
  } else {
    return { statusCode: 400, code: 'BadRequest', message: '用户名或密码不正确' }
  }
}

export default handleUncaughtError(post(grant))
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import ldap from 'ldapjs'

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
    url: `ldaps://${process.env.NEXT_PUBLIC_LDAP_SERVER_IP}`,
    tlsOptions: {
      rejectUnauthorized: false, // 禁用证书验证
    },
  }

  const userDN = `uid=${username},ou=users,dc=huoyijie,dc=cn`

  const client = ldap.createClient(ldapOptions)

  try {
    await bindAsync(client, userDN, password)
    console.log('LDAP bind successful')

    // Perform other LDAP operations if needed...

    await unbindAsync(client)
    console.log('LDAP unbind successful')

    return true
  } catch (err) {
    console.error('LDAP operation failed:', err)
    return false
  }
}

export default async function handler(req, res) {
  const { username, password } = req.query

  try {
    const isAuthenticated = await ldapAuthenticate(username, password)

    if (isAuthenticated) {
      console.log('User authentication successful')
      res.status(200).json({ message: 'ok' })
    } else {
      console.log('User authentication failed')
      res.status(400).json({ message: '用户名或密码不正确' })
    }
  } catch (err) {
    console.error('Authentication error:', err)
    res.status(500).json({ message: '服务器异常' })
  }
}
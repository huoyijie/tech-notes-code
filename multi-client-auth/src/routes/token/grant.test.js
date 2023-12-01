'use strict'

import { test } from 'tap'
import app from '#app'

const url = '/api/token/grant'

test(`requests ${url}`, async t => {
  const App = app()

  const res1 = await App.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: {
      appId: 1,
      appSecret: "123456",
      email: "huoyijie@huoyijie.cn",
      password: "12345678",
    },
    url,
  })

  t.equal(res1.statusCode, 200, 'grant status 200')

  const { access_token } = JSON.parse(res1.body)
  if (access_token) {
    const res2 = await App.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${access_token}`
      },
      url: '/api/site',
    })

    t.equal(res2.statusCode, 401, 'site status 401')

    const res3 = await App.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${access_token}`
      },
      url: '/api/admin',
    })

    t.equal(res3.statusCode, 200, 'site status 200')
  }

  const res4 = await App.inject({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    payload: {
      appId: 2,
      appSecret: "654321",
      email: "huoyijie@huoyijie.cn",
      password: "12345678",
    },
    url,
  })

  t.equal(res4.statusCode, 200, 'grant status 200')

})
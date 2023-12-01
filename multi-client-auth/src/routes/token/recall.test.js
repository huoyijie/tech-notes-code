'use strict'

import { test } from 'tap'
import app from '#app'

const url = '/api/token/grant'

test('requests /api/token/recall', async t => {
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

  const { access_token, refresh_token } = JSON.parse(res1.body)
  t.equal(!!access_token, true)
  t.equal(!!refresh_token, true)

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

    t.equal(res3.statusCode, 200, 'admin status 200')
  }

  if (refresh_token) {
    const res4 = await App.inject({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: {
        accessToken: access_token,
        refreshToken: refresh_token,
      },
      url: '/api/token/recall',
    })

    t.equal(res4.statusCode, 200, 'recall status 200')

    const res5 = await App.inject({
      method: 'GET',
      headers: {
        authorization: `Bearer ${access_token}`
      },
      url: '/api/admin',
    })

    t.equal(res5.statusCode, 401, 'admin status 401')
  }
})
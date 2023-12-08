import { ClientError, ServerError } from './errors'

function withMethod(method) {
  if (!!method) {
    return { method: method.toUpperCase() }
  } else {
    return {}
  }
}

function withContentType(method) {
  const upper = method?.toUpperCase()
  if (upper == 'POST' || upper == 'PUT') {
    return { 'Content-Type': 'application/json' }
  } else {
    return {}
  }
}

function withAuthorization(accessToken) {
  if (!!accessToken) {
    return { 'Authorization': `Bearer ${accessToken}` }
  } else {
    return {}
  }
}

function withBody(data) {
  if (!!data) {
    return { body: JSON.stringify(data) }
  } else {
    return {}
  }
}

export default async function fetcher({ url, method, accessToken, body }) {
  let data, error
  try {
    const options = {
      ...withMethod(method),
      headers: {
        ...withContentType(method),
        ...withAuthorization(accessToken),
      },
      ...withBody(body),
    }

    const res = await fetch(url, options)

    if (res.ok) {
      data = await res.json()
    } else if (res.status == 400 || res.status == 401 || res.status == 403) {
      const { code, message } = await res.json()
      error = new ClientError(code, message, res.status)
    } else if (res.status == 404) {
      error = new ClientError('404', res.statusText, res.status)
    } else { // 500
      error = new ServerError(res.statusText, res.status)
    }
  } catch ({ message }) {
    error = new ServerError(message)
  }

  if (error) {
    throw error
  }

  return data
}
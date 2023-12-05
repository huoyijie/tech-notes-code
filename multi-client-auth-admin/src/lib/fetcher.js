import { ClientError, ServerError } from './errors'

export default async function fetcher(url, options) {
  let data, error
  try {
    const res = await fetch(url, options)

    if (res.ok) {
      data = await res.json()
    } else if (res.status == 400) {
      const { message } = await res.json()
      error = new ClientError(message)
    } else {
      const E = res.status >= 500 ? ServerError : ClientError
      error = new E(res.statusText, res.status)
    }
  } catch ({ message }) {
    error = new ClientError(message)
  }

  if (error) {
    throw error
  }

  return data
}
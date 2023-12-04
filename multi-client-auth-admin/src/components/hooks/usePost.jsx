export default function usePost(url) {

  const fetcher = async (params) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const resData = await res.json()
    if (!res.ok) {
      throw new Error(resData.message)
    }
    return resData
  }

  const submit = async (params) => {
    try {
      const data = await fetcher(params)
      return { data }
    } catch (error) {
      return { error }
    }
  }

  return { submit }
}
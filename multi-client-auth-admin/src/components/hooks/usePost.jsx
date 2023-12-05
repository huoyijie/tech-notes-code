import fetcher from '@/lib/fetcher'

export default function usePost(url) {

  const submit = async (data) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }

    try {
      const data = await fetcher(url, options)
      return { data }
    } catch (error) {
      return { error }
    }
  }

  return { submit }
}
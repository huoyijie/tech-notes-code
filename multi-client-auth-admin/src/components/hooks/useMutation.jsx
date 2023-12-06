import fetcher from '@/lib/fetcher'
import useUrlLocale from './useUrlLocale'

/**
 * Consider calling swr.mutate(url) after submit
 * @param {*} url 
 * @param {*} method 'POST' | 'PUT' | 'DELETE'
 * @returns 
 */
export default function useMutation(url, method = 'POST') {
  const urlLocale = useUrlLocale(url)

  const submit = async (data) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }

    try {
      const data = await fetcher(urlLocale, options)
      return { data }
    } catch (error) {
      return { error }
    }
  }

  return { submit }
}
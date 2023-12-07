import fetcher from '@/lib/fetcher'
import useUrlLocale from './useUrlLocale'
import { useRouter } from 'next/router'

/**
 * Consider calling swr.mutate(url) after submit
 * @param {*} url 
 * @param {*} method 'POST' | 'PUT' | 'DELETE'
 * @returns 
 */
export default function useMutation({ url, method = 'POST' }) {
  const router = useRouter()
  const urlLocale = useUrlLocale(url)

  const submit = async (data) => {
    const key = {
      url: urlLocale,
      method,
      accessToken: null,
      body: data,
    }

    try {
      const data = await fetcher(key)
      return { data }
    } catch (error) {
      if (error.statusCode == 401) {
        router.push('/signin')
      }
      return { error }
    }
  }

  return { submit }
}
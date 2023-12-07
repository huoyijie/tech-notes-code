import fetcher from '@/lib/fetcher'
import useUrlLocale from './useUrlLocale'
import useSWRMutation from 'swr/mutation'
import useToken from './useToken'

export default function useMutation({ url, method = 'POST', options }) {
  const urlLocale = useUrlLocale(url)
  const token = useToken()

  const key = {
    url: urlLocale,
    method: method.toUpperCase(),
    accessToken: token.value?.access_token,
  }

  const submit = async (key, { arg: body }) => {
    try {
      const data = await fetcher({ ...key, body })
      return { data }
    } catch (error) {
      return { error }
    }
  }

  return useSWRMutation(key, submit, options)
}
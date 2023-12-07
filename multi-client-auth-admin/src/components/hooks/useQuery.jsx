import useSWR from 'swr'
import useUrlLocale from './useUrlLocale'
import useToken from './useToken'

export default function useQuery({ url, options }) {
  const urlLocale = useUrlLocale(url)
  const token = useToken()

  const key = token.ready ? {
    url: urlLocale,
    method: 'GET',
    accessToken: token.value?.access_token,
  } : null

  return useSWR(key, options)
}
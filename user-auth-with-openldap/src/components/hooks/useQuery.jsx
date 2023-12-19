import useSWR from 'swr'
import useToken from './useToken'

export default function useQuery({ url, options }) {
  const token = useToken()

  const key = token.ready ? {
    url,
    method: 'GET',
    accessToken: token.value?.access_token,
  } : null

  return useSWR(key, options)
}
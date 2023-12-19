import fetcher from '@/lib/fetcher'
import useSWRMutation from 'swr/mutation'
import useToken from './useToken'

export default function useMutation({ url, method = 'POST', options }) {
  const token = useToken()

  const key = {
    url,
    method: method.toUpperCase(),
    accessToken: token.value?.access_token,
  }

  const submit = async (key, { arg: body }) => (await fetcher({ ...key, body }))

  return useSWRMutation(key, submit, options)
}
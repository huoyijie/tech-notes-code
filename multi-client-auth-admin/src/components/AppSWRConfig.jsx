import util from '@/lib/util'
import fetcher from '@/lib/fetcher'
import { useRouter } from 'next/router'
import { SWRConfig } from 'swr'
import useToken from './hooks/useToken'
import useMutation from './hooks/useMutation'

export default function AppSWRConfig({ children }) {
  const router = useRouter()
  const token = useToken()
  const { trigger } = useMutation({ url: '/api/token/refresh' })

  return (
    <SWRConfig value={{
      fetcher,
      onError: async ({ statusCode, code }) => {
        if (statusCode == 401) {
          if (code != 'TokenExpired' || !token.value) {
            await util.wait(1000)
            router.push('/signin')
          } else {
            const {
              access_token: accessToken,
              refresh_token: refreshToken,
            } = token.value
            try {
              const data = await trigger({ accessToken, refreshToken })
              token.set(data)
            } catch (error) {
              await util.wait(1000)
              router.push('/signin')
            }
          }
        }
      }
    }}>
      {children}
    </SWRConfig>
  )
}
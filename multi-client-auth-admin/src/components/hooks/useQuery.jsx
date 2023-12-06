import useSWR from 'swr'
import useUrlLocale from './useUrlLocale'

export default function useQuery(url) {
  const urlLocale = useUrlLocale(url)
  return useSWR(urlLocale)
}
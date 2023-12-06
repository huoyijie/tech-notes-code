import { useLocale } from 'next-intl'

export default function useUrlLocale(path) {
  const lng = useLocale()

  return `${path}?${new URLSearchParams({ lng }).toString()}`
}
import { useLocale } from 'next-intl'

export default function useLang(path) {
  const lng = useLocale()

  return `${path}?${new URLSearchParams({ lng }).toString()}`
}
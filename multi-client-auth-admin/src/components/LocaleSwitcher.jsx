import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslations } from 'next-intl'
import Typography from '@mui/material/Typography'

export default function LocaleSwitcher(props) {
  const t = useTranslations('localeSwitcher')

  const { locale, locales, route } = useRouter()
  const otherLocale = locales?.find((cur) => cur !== locale)

  return (
    <Link href={route} locale={otherLocale} style={{ textDecoration: 'none' }}>
      <Typography
        component="span"
        {...props}
      >
        {t('switchLocale')}
      </Typography>
    </Link>
  )
}
import Dashboard from '@/components/Dashboard'
import GetStaticProps from '@/components/GetStaticProps'
import util from '@/lib/util'
import { useTranslations } from 'next-intl'
import Head from 'next/head'

export const getStaticProps = GetStaticProps

export default function Home() {
  const t = useTranslations()
  return (
    <>
      <Head>
        <title>{util.title(t('dashboard.Dashboard'), t('common.Admin'))}</title>
      </Head>
      <Dashboard />
    </>
  )
}

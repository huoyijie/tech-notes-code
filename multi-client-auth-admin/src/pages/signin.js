import GetStaticProps from '@/components/GetStaticProps'
import SignIn from '@/components/SignIn'
import Head from 'next/head'
import { useTranslations } from 'next-intl'
import util from '@/lib/util'

export const getStaticProps = GetStaticProps

export default function Signin() {
  const t = useTranslations()

  return (
    <>
      <Head>
        <title>{util.title(t('signin.SignIn'), t('common.Admin'))}</title>
      </Head>
      <SignIn />
    </>
  )
}
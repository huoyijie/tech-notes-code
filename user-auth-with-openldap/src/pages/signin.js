import SignIn from '@/components/SignIn'
import Head from 'next/head'
import util from '@/lib/util'

export default function Signin() {
  return (
    <>
      <Head>
        <title>{util.title('登录', '管理后台')}</title>
      </Head>
      <SignIn />
    </>
  )
}
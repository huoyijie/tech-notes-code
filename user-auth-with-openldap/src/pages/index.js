import Dashboard from '@/components/Dashboard'
import util from '@/lib/util'
import Head from 'next/head'

export default function Home() {
  return (
    <>
      <Head>
        <title>{util.title('仪表盘', '管理后台')}</title>
      </Head>
      <Dashboard />
    </>
  )
}

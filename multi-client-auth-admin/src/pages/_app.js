import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import CssBaseline from '@mui/material/CssBaseline'
import Head from 'next/head'
import { SWRConfig } from 'swr'
import fetcher from '@/lib/fetcher'
import { NextIntlClientProvider } from 'next-intl'
import { useRouter } from 'next/router'

const App = ({ Component, pageProps }) => {
  const router = useRouter()

  return (
    <NextIntlClientProvider
      locale={router.locale}
      timeZone="Asia/Shanghai"
      messages={pageProps.messages}
    >
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <CssBaseline />
      <SWRConfig value={{
        fetcher
      }}>
        <Component {...pageProps} />
      </SWRConfig>
    </NextIntlClientProvider>
  )
}

export default App
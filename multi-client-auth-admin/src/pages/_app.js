import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import CssBaseline from '@mui/material/CssBaseline'
import Head from 'next/head'
import { NextIntlClientProvider } from 'next-intl'
import { useRouter } from 'next/router'
import AppSWRConfig from '@/components/AppSWRConfig'

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
      <AppSWRConfig>
        <Component {...pageProps} />
      </AppSWRConfig>
    </NextIntlClientProvider>
  )
}

export default App
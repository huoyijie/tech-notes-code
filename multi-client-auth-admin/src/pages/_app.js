import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import CssBaseline from '@mui/material/CssBaseline'
import Head from 'next/head'
import { SWRConfig } from 'swr'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
        <title>Admin</title>
      </Head>
      <CssBaseline />
      <SWRConfig value={{
        fetcher: async (url, options) => {
          const res = await fetch(url, options)
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.message)
          }
          return data
        }
      }}>
        <Component {...pageProps} />
      </SWRConfig>
    </>
  )
}
